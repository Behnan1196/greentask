'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { surumuAnalizEt } from '@/lib/plan/analiz';
import { satirdanOge } from '@/lib/plan/durum';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { OgeDurumu, PlanAlanlari, PlanBulgusu, PlanDurumu } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const PLAN_DURUMLARI: PlanDurumu[] = ['taslak', 'revizyonda', 'sunuldu', 'onaylandi'];
const OGE_DURUMLARI: OgeDurumu[] = ['degismedi', 'kontrol', 'guncellenecek', 'eklenecek', 'tamam'];
const AZAMI_BOYUT = 100 * 1024 * 1024;

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

function planAlanlari(form: FormData): PlanAlanlari {
  const durum = (al(form, 'durum') ?? 'revizyonda') as PlanDurumu;
  if (!PLAN_DURUMLARI.includes(durum)) throw new Error('Geçersiz durum');
  return {
    baslik: al(form, 'baslik', undefined, true)!,
    durum,
    onayli_surum: al(form, 'onayli_surum'),
    onay_tarihi: al(form, 'onay_tarihi', TARIH),
    sunum_tarihi: al(form, 'sunum_tarihi', TARIH),
    hazirlayan_id: al(form, 'hazirlayan_id', UUID),
    notlar: al(form, 'notlar'),
  };
}

const tesisIdleri = (form: FormData) =>
  form
    .getAll('tesis_id')
    .map(String)
    .filter((x) => UUID.test(x));

export async function planOlustur(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const alanlar = planAlanlari(form);
  const id = await depo.planOlustur({ ...alanlar, hazirlayan_id: alanlar.hazirlayan_id ?? kullanici.id }, tesisIdleri(form));
  yenile();
  redirect(`/planlar/${id}`);
}

export async function planGuncelle(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.planGuncelle(al(form, 'id', UUID, true)!, planAlanlari(form), tesisIdleri(form));
  yenile();
}

/** Tarayıcının Word dosyasını doğrudan depoya yükleyeceği adres (Vercel 4,5 MB istek sınırını aşmak için). */
export async function yuklemeBaslat(planId: string, dosyaAdi: string, boyut: number) {
  const { depo } = await oturumuDogrula();
  if (!UUID.test(planId) || !(await depo.plan(planId))) return { hata: 'Plan bulunamadı' };
  if (!/\.docx$/i.test(dosyaAdi)) return { hata: 'Yalnızca Word (.docx) dosyası yüklenebilir. Eski .doc dosyasını Word’de .docx olarak kaydedin.' };
  if (!(boyut > 0 && boyut <= AZAMI_BOYUT)) return { hata: 'Dosya 100 MB sınırını aşıyor' };
  const zaman = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const yol = `${planId}/${zaman}_${crypto.randomUUID().slice(0, 8)}.docx`;
  return { yol, hedef: await depo.planYuklemeHedefi(yol) };
}

/** Yükleme bittikten sonra: dosyayı tarar, sürümü kaydeder. */
export async function surumuIsle(planId: string, yol: string, dosyaAdi: string, boyut: number) {
  const { depo } = await oturumuDogrula();
  if (!UUID.test(planId) || !yol.startsWith(`${planId}/`) || yol.includes('..')) return { hata: 'Geçersiz istek' };
  const plan = await depo.plan(planId);
  if (!plan) return { hata: 'Plan bulunamadı' };
  try {
    const sonuc = await surumuAnalizEt(depo, plan, { yol, dosyaAdi: dosyaAdi.slice(0, 200), boyut });
    yenile();
    return sonuc;
  } catch (e) {
    return { hata: e instanceof Error ? e.message : 'Dosya işlenemedi' };
  }
}

export async function ogeGuncelle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum') as OgeDurumu | null;
  if (durum && !OGE_DURUMLARI.includes(durum)) throw new Error('Geçersiz durum');
  await depo.ogeGuncelle(al(form, 'id', UUID, true)!, { ...(durum ? { durum } : {}), notlar: al(form, 'notlar') });
  yenile();
}

export async function bulguDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', /^(acik|duzeltildi|yoksay)$/, true) as PlanBulgusu['durum'];
  await depo.planBulgusuGuncelle(al(form, 'id', UUID, true)!, durum);
  yenile();
}

/**
 * Revizyon maddeleri: her satır bir görev olur. Satır "Tablo 17 …", "Şekil 3 …" ya da "5.2 …" ile başlıyorsa
 * görev o öğeye bağlanır ve öğe "Güncellenecek" olarak işaretlenir.
 */
export async function revizyonMaddeleriEkle(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const planId = al(form, 'plan_id', UUID, true)!;
  const plan = await depo.plan(planId);
  if (!plan) throw new Error('Plan bulunamadı');
  const satirlar = String(form.get('maddeler') ?? '')
    .split('\n')
    .map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s+(?=\S)/, '').trim())
    .filter((s) => s.length > 2)
    .slice(0, 100);
  if (!satirlar.length) return;
  const ogeler = await depo.planOgeleri(planId);
  const sorumlu = al(form, 'sorumlu_id', UUID) ?? plan.hazirlayan_id ?? kullanici.id;
  const sonTarih = al(form, 'son_tarih', TARIH) ?? plan.sunum_tarihi;
  const tesisId = plan.tesis_idleri.length === 1 ? plan.tesis_idleri[0] : null;
  for (const satir of satirlar) {
    const oge = satirdanOge(satir, ogeler);
    await depo.gorevEkle({
      baslik: satir.slice(0, 300),
      aciklama: `İşletme planı revizyonu: ${plan.baslik}${oge ? `\nİlgili öğe: ${oge.numara} ${oge.ad}` : ''}`,
      sorumlu_id: sorumlu,
      son_tarih: sonTarih,
      tesis_id: tesisId,
      kaynak: 'isletme_plani',
      isletme_plani_id: planId,
      plan_ogesi_id: oge?.id ?? null,
    });
    if (oge && (oge.durum === 'degismedi' || oge.durum === 'kontrol')) await depo.ogeGuncelle(oge.id, { durum: 'guncellenecek' });
  }
  yenile();
}

/** Tarama bulgusunu revizyon görevine çevirir. Bulgu açık kalır; düzeltilince yeni sürümün taramasında kaybolur. */
export async function bulgudanGorev(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const planId = al(form, 'plan_id', UUID, true)!;
  const plan = await depo.plan(planId);
  if (!plan) throw new Error('Plan bulunamadı');
  await depo.gorevEkle({
    baslik: al(form, 'baslik', undefined, true)!.slice(0, 300),
    aciklama: [al(form, 'detay'), al(form, 'oneri') && `Öneri: ${al(form, 'oneri')}`, `İşletme planı: ${plan.baslik}`]
      .filter(Boolean)
      .join('\n'),
    sorumlu_id: plan.hazirlayan_id ?? kullanici.id,
    son_tarih: plan.sunum_tarihi,
    tesis_id: plan.tesis_idleri.length === 1 ? plan.tesis_idleri[0] : null,
    kaynak: 'isletme_plani',
    isletme_plani_id: planId,
  });
  yenile();
}
