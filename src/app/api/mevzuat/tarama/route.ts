import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAyarlari } from '@/lib/supabase/sunucu';
import { demoTaramaRpc } from '@/lib/veri/demo-depo';
import { demoModu } from '@/lib/veri/depo';

// Otomatik mevzuat taraması (zamanlanmış görev) için uç. Oturum yerine "Authorization: Bearer <anahtar>" kullanır.
// Anahtar veritabanında yalnızca özetiyle saklanır ve yalnızca öneri ekleyebilir (onay, görev açma: insan).
//   GET  → tarama bağlamı (sektör grupları, kütüphane, son kayıtlar)
//   POST → { kayitlar: [{ ad, tur, rg_metin, ozet, etkilenen_gruplar, etkilenen_tesisler, aksiyon, kaynak_url, tarama_notu }] }

const anahtar = (r: Request) => /^Bearer\s+(\S{20,200})$/.exec(r.headers.get('authorization') ?? '')?.[1] ?? null;

async function rpc(ad: 'mevzuat_tarama_baglami' | 'mevzuat_tarama_kaydet', p: { p_anahtar: string; p_kayitlar?: unknown }) {
  if (demoModu()) return demoTaramaRpc(ad, p.p_kayitlar === undefined ? [p.p_anahtar] : [p.p_anahtar, JSON.stringify(p.p_kayitlar)]);
  const { url, anahtar: k } = supabaseAyarlari();
  const r = await createClient(url, k, { auth: { persistSession: false } }).rpc(ad, p);
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const yetkisiz = () => NextResponse.json({ hata: 'Geçersiz ya da kapatılmış anahtar' }, { status: 401 });

export async function GET(request: Request) {
  const a = anahtar(request);
  if (!a) return yetkisiz();
  const v = await rpc('mevzuat_tarama_baglami', { p_anahtar: a });
  return v ? NextResponse.json(v) : yetkisiz();
}

export async function POST(request: Request) {
  const a = anahtar(request);
  if (!a) return yetkisiz();
  let govde: { kayitlar?: unknown };
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ hata: 'Gövde JSON olmalı' }, { status: 400 });
  }
  if (!Array.isArray(govde.kayitlar)) return NextResponse.json({ hata: '"kayitlar" dizisi gerekli' }, { status: 400 });
  try {
    const eklenen = await rpc('mevzuat_tarama_kaydet', { p_anahtar: a, p_kayitlar: govde.kayitlar });
    if (eklenen == null) return yetkisiz();
    return NextResponse.json({ eklenen, gelen: govde.kayitlar.length });
  } catch (e) {
    return NextResponse.json({ hata: e instanceof Error ? e.message : 'Kaydedilemedi' }, { status: 400 });
  }
}
