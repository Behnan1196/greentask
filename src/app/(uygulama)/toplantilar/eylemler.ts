'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { GorevDurumu } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const GOREV_DURUMLARI: GorevDurumu[] = ['acik', 'devam', 'tamamlandi', 'iptal'];

function al(form: FormData, ad: string, desen?: RegExp, zorunlu = false): string | null {
  const v = String(form.get(ad) ?? '').trim();
  if (!v) {
    if (zorunlu) throw new Error(`${ad} gerekli`);
    return null;
  }
  if (desen && !desen.test(v)) throw new Error(`Geçersiz değer: ${ad}`);
  return v;
}

const yenile = () => revalidatePath('/', 'layout');

export async function toplantiAc(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = await depo.toplantiOlustur({
    tarih: al(form, 'tarih', TARIH, true)!,
    baslik: al(form, 'baslik') ?? 'Haftalık büro toplantısı',
  });
  yenile();
  redirect(`/toplantilar/${id}`);
}

export async function toplantiNotuKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.toplantiGuncelle(al(form, 'id', UUID, true)!, { notlar: al(form, 'notlar') });
  yenile();
}

export async function toplantiDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', /^(acik|kapandi)$/, true) as 'acik' | 'kapandi';
  await depo.toplantiGuncelle(al(form, 'id', UUID, true)!, { durum });
  yenile();
}

export async function maddeEkle(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.maddeEkle({
    toplanti_id: al(form, 'toplanti_id', UUID, true)!,
    baslik: al(form, 'baslik', undefined, true)!,
    tesis_id: al(form, 'tesis_id', UUID),
    tesis_yukumluluk_id: al(form, 'tesis_yukumluluk_id', UUID),
    kaynak: (al(form, 'kaynak', /^(elle|sistem|mevzuat)$/) ?? 'elle') as 'elle' | 'sistem' | 'mevzuat',
  });
  yenile();
}

export async function maddeKarariKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.maddeGuncelle(al(form, 'id', UUID, true)!, { karar: al(form, 'karar') });
  yenile();
}

export async function maddeSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.maddeSil(al(form, 'id', UUID, true)!);
  yenile();
}

export async function maddedenGorev(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  await depo.gorevEkle({
    baslik: al(form, 'baslik', undefined, true)!,
    aciklama: null,
    sorumlu_id: al(form, 'sorumlu_id', UUID) ?? kullanici.id,
    son_tarih: al(form, 'son_tarih', TARIH),
    tesis_id: al(form, 'tesis_id', UUID),
    toplanti_id: al(form, 'toplanti_id', UUID, true),
    toplanti_maddesi_id: al(form, 'toplanti_maddesi_id', UUID, true),
    kaynak: 'toplanti',
  });
  yenile();
}

export async function gorevDurumunuDegistir(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', undefined, true) as GorevDurumu;
  if (!GOREV_DURUMLARI.includes(durum)) throw new Error('Geçersiz durum');
  await depo.gorevDurumu(al(form, 'id', UUID, true)!, durum);
  yenile();
}
