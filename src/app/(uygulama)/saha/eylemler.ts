'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { BulguOnemi, ZiyaretDurumu } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const DURUMLAR: ZiyaretDurumu[] = ['planli', 'yapildi', 'raporlandi', 'iptal'];
const ONEMLER: BulguOnemi[] = ['yuksek', 'orta', 'dusuk', 'uygun'];

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

export async function ziyaretPlanla(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const id = await depo.ziyaretOlustur({
    tesis_id: al(form, 'tesis_id', UUID, true)!,
    tarih: al(form, 'tarih', TARIH, true)!,
    ziyaretci_id: al(form, 'ziyaretci_id', UUID) ?? kullanici.id,
    amac: al(form, 'amac'),
  });
  yenile();
  redirect(`/saha/${id}`);
}

export async function ziyaretDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', undefined, true) as ZiyaretDurumu;
  if (!DURUMLAR.includes(durum)) throw new Error('Geçersiz durum');
  await depo.ziyaretGuncelle(al(form, 'id', UUID, true)!, { durum });
  yenile();
}

export async function ziyaretMetniKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  const alan = al(form, 'alan', /^(saha_notu|rapor_ozeti)$/, true) as 'saha_notu' | 'rapor_ozeti';
  await depo.ziyaretGuncelle(al(form, 'id', UUID, true)!, { [alan]: al(form, 'metin') });
  yenile();
}

export async function bulguEkle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const onem = (al(form, 'onem') ?? 'orta') as BulguOnemi;
  if (!ONEMLER.includes(onem)) throw new Error('Geçersiz önem');
  await depo.bulguEkle({
    ziyaret_id: al(form, 'ziyaret_id', UUID, true)!,
    bulgu: al(form, 'bulgu', undefined, true)!,
    dayanak: al(form, 'dayanak'),
    onem,
    duzeltici_faaliyet: al(form, 'duzeltici_faaliyet'),
    termin: al(form, 'termin', TARIH),
    dosya_id: al(form, 'dosya_id', UUID),
  });
  yenile();
}

export async function bulguDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', /^(acik|kapandi)$/, true) as 'acik' | 'kapandi';
  await depo.bulguGuncelle(al(form, 'id', UUID, true)!, { durum });
  yenile();
}

export async function bulguSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.bulguSil(al(form, 'id', UUID, true)!);
  yenile();
}

/** Bulgunun düzeltici faaliyetini, tesisin sorumlusuna (yoksa ziyaretçiye) görev olarak açar. */
export async function bulgudanGorev(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const ziyaretId = al(form, 'ziyaret_id', UUID, true)!;
  const bulguId = al(form, 'id', UUID, true)!;
  const z = await depo.ziyaret(ziyaretId);
  const b = (await depo.bulgular([ziyaretId])).find((x) => x.id === bulguId);
  if (!z || !b) throw new Error('Bulgu bulunamadı');
  if (b.gorev_id) return;
  const tesis = (await depo.tesisler()).find((t) => t.id === z.tesis_id);
  const gorevId = await depo.gorevEkle({
    baslik: b.duzeltici_faaliyet ? `${b.duzeltici_faaliyet} (saha bulgusu)` : `Saha bulgusu: ${b.bulgu}`,
    aciklama: [`Bulgu: ${b.bulgu}`, b.dayanak && `Dayanak: ${b.dayanak}`].filter(Boolean).join('\n'),
    sorumlu_id: tesis?.sorumlu_id ?? z.ziyaretci_id ?? kullanici.id,
    son_tarih: b.termin,
    tesis_id: z.tesis_id,
    kaynak: 'saha',
  });
  await depo.bulguGuncelle(bulguId, { gorev_id: gorevId });
  yenile();
}

export async function dosyaSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.dosyaSil(al(form, 'id', UUID, true)!);
  yenile();
}
