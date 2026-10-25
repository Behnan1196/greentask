'use server';

import { revalidatePath } from 'next/cache';
import type { KayitDurumu, OlayTuru } from '@/lib/termin/motor';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { YukumlulukGuncelleme } from '@/lib/veri/tipler';

const DURUMLAR: KayitDurumu[] = ['aktif', 'muaf', 'kapsam_disi', 'beklemede'];
const OLAYLAR: OlayTuru[] = ['gerceklesti', 'sunuldu', 'eksiklik_geldi', 'eksiklik_yanitlandi', 'onaylandi', 'not'];
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** '' → null (atanmamış / tesis sorumlusuna bırak), geçersiz değer → hata. */
function kullaniciAlani(form: FormData, ad: string): string | null {
  const v = String(form.get(ad) ?? '').trim();
  if (!v) return null;
  if (!UUID.test(v)) throw new Error('Geçersiz kullanıcı');
  return v;
}

function tarihAlani(form: FormData, ad: string): string | null | undefined {
  if (!form.has(ad)) return undefined;
  const v = String(form.get(ad) ?? '').trim();
  if (!v) return null;
  if (!TARIH.test(v)) throw new Error(`Geçersiz tarih: ${ad}`);
  return v;
}

function yenile(form: FormData) {
  const kod = String(form.get('gt_kod') ?? '');
  revalidatePath('/');
  revalidatePath('/tesisler');
  revalidatePath('/islerim');
  if (kod) revalidatePath(`/tesisler/${kod}`);
}

export async function yukumlulukKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = String(form.get('id') ?? '');
  const durum = String(form.get('durum') ?? '') as KayitDurumu;
  if (!id || !DURUMLAR.includes(durum)) throw new Error('Geçersiz istek');

  const alanlar: YukumlulukGuncelleme = {
    durum,
    notlar: String(form.get('notlar') ?? '').trim() || null,
    sorumlu_id: kullaniciAlani(form, 'sorumlu_id'),
  };
  for (const a of ['gecerlilik_bitis', 'belge_tarihi', 'son_islem', 'baslangic'] as const) {
    const v = tarihAlani(form, a);
    if (v !== undefined) alanlar[a] = v;
  }
  await depo.yukumlulukGuncelle(id, alanlar);
  yenile(form);
}

export async function olayEkle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = String(form.get('tesis_yukumluluk_id') ?? '');
  const tur = String(form.get('tur') ?? '') as OlayTuru;
  const tarih = tarihAlani(form, 'tarih');
  if (!id || !tarih || !OLAYLAR.includes(tur)) throw new Error('Tarih ve olay türü gerekli');
  await depo.olayEkle({ tesis_yukumluluk_id: id, tarih, tur, aciklama: String(form.get('aciklama') ?? '').trim() || null });
  yenile(form);
}

export async function olaySil(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = String(form.get('id') ?? '');
  if (!id) throw new Error('Geçersiz istek');
  await depo.olaySil(id);
  yenile(form);
}

export async function tesisSorumlusuKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  const tesisId = String(form.get('tesis_id') ?? '');
  if (!UUID.test(tesisId)) throw new Error('Geçersiz istek');
  await depo.tesisSorumlusuAta(tesisId, kullaniciAlani(form, 'sorumlu_id'));
  yenile(form);
}
