'use server';

import { revalidatePath } from 'next/cache';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { GorevDurumu } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const DURUMLAR: GorevDurumu[] = ['acik', 'devam', 'tamamlandi', 'iptal'];

function secimli(form: FormData, ad: string, desen: RegExp): string | null {
  const v = String(form.get(ad) ?? '').trim();
  if (!v) return null;
  if (!desen.test(v)) throw new Error(`Geçersiz değer: ${ad}`);
  return v;
}

export async function gorevEkle(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const baslik = String(form.get('baslik') ?? '').trim();
  if (!baslik) throw new Error('Görev başlığı gerekli');
  await depo.gorevEkle({
    baslik,
    aciklama: String(form.get('aciklama') ?? '').trim() || null,
    son_tarih: secimli(form, 'son_tarih', TARIH),
    tesis_id: secimli(form, 'tesis_id', UUID),
    sorumlu_id: secimli(form, 'sorumlu_id', UUID) ?? kullanici.id,
  });
  revalidatePath('/', 'layout');
}

export async function gorevDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = secimli(form, 'id', UUID);
  const durum = String(form.get('durum') ?? '') as GorevDurumu;
  if (!id || !DURUMLAR.includes(durum)) throw new Error('Geçersiz istek');
  await depo.gorevDurumu(id, durum);
  revalidatePath('/', 'layout');
}

export async function takvimAnahtariniYenile() {
  const { depo } = await oturumuDogrula();
  await depo.takvimAnahtari(true);
  revalidatePath('/', 'layout');
}
