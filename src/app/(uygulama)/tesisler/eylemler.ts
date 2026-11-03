'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { oturumuDogrula } from '@/lib/veri/depo';
import { GT_KOD, UUID, al, kisiAlanlari, tesisAlanlari } from './form-okuma';

const yenile = () => revalidatePath('/', 'layout');

/** Yeni tesis: bilgileri, sorumlusu, ilk yetkilisi ve izlenecek yükümlülükleri tek adımda. */
export async function tesisOlustur(form: FormData) {
  const { depo } = await oturumuDogrula();
  const gtKod = al(form, 'gt_kod', GT_KOD, true)!;
  const id = await depo.tesisEkle(gtKod, tesisAlanlari(form), al(form, 'sorumlu_id', UUID));
  const turler = new Set((await depo.turler()).map((t) => t.id));
  for (const turId of new Set(form.getAll('tur_id').map(String))) {
    if (turler.has(turId)) await depo.yukumlulukEkle({ tesis_id: id, tur_id: turId, etiket: '' });
  }
  if (al(form, 'ad_soyad')) await depo.kisiEkle(id, kisiAlanlari(form));
  yenile();
  redirect(`/tesisler/${gtKod}`);
}
