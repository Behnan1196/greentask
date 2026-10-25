import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { icsOlustur } from '@/lib/takvim/ics';
import { takvimOlaylari } from '@/lib/takvim/olaylar';
import { bugun } from '@/lib/termin/tarih';
import { demoModu } from '@/lib/veri/depo';
import { demoTakvimVerisi } from '@/lib/veri/demo-depo';
import { terminleriHesapla } from '@/lib/veri/terminler';
import type { TakvimVerisi } from '@/lib/veri/tipler';

// Kişisel takvim aboneliği: /takvim/<gizli-anahtar>.ics
// Takvim uygulamaları oturum açamadığı için kimlik, adresteki anahtardır (Benim İşlerim'den yenilenebilir).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function veriGetir(anahtar: string): Promise<TakvimVerisi | null> {
  if (demoModu()) return demoTakvimVerisi(anahtar);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc('takvim_verisi', { p_anahtar: anahtar });
  if (error) throw new Error(error.message);
  return data as TakvimVerisi | null;
}

export async function GET(request: NextRequest, ctx: RouteContext<'/takvim/[anahtar]'>) {
  const anahtar = (await ctx.params).anahtar.replace(/\.ics$/i, '');
  if (!UUID.test(anahtar)) return new Response('Bulunamadı', { status: 404 });

  const v = await veriGetir(anahtar);
  if (!v) return new Response('Bulunamadı', { status: 404 });

  const terminler = terminleriHesapla(v.kayitlar, v.turler, v.tesisler, v.olaylar, bugun());
  const ics = icsOlustur(`Greentask · ${v.kullanici.ad_soyad}`, takvimOlaylari(terminler, v.gorevler, request.nextUrl.origin));
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="greentask.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  });
}
