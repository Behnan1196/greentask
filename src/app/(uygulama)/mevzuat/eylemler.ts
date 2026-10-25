'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { etkilenenTesisler } from '@/lib/mevzuat/etki';
import { bugun } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
const GRUP = /^G\d{1,2}$/;

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

/** Formdaki grup kutucukları → "G1,G5" (eski serbest metin biçimiyle uyumlu). */
const gruplar = (form: FormData) =>
  form
    .getAll('grup')
    .map(String)
    .filter((g) => GRUP.test(g))
    .join(',') || null;

function degisiklikAlanlari(form: FormData) {
  return {
    tespit_tarihi: al(form, 'tespit_tarihi', TARIH) ?? bugun(),
    rg_metin: al(form, 'rg_metin'),
    tur: al(form, 'tur'),
    ad: al(form, 'ad', undefined, true)!,
    ozet: al(form, 'ozet'),
    etkilenen_gruplar: gruplar(form),
    etkilenen_tesisler: al(form, 'etkilenen_tesisler'),
    aksiyon: al(form, 'aksiyon'),
    mevzuat_id: al(form, 'mevzuat_id', UUID),
  };
}

export async function degisiklikEkle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = await depo.degisiklikEkle(degisiklikAlanlari(form));
  yenile();
  redirect(`/mevzuat?acik=${id}#d-${id}`);
}

export async function degisiklikGuncelle(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.degisiklikGuncelle(al(form, 'id', UUID, true)!, degisiklikAlanlari(form));
  yenile();
}

export async function degisiklikDurumu(form: FormData) {
  const { depo } = await oturumuDogrula();
  const durum = al(form, 'durum', /^(acik|kapali)$/, true) as 'acik' | 'kapali';
  await depo.degisiklikGuncelle(al(form, 'id', UUID, true)!, { durum });
  yenile();
}

/**
 * Seçilen her tesis için görev açar (tesis sorumlusuna; yoksa açan kişiye).
 * Aynı değişiklik için o tesiste zaten görev varsa yenisini açmaz.
 */
export async function etkiGorevleriAc(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const id = al(form, 'id', UUID, true)!;
  const d = (await depo.mevzuatDegisiklikleri()).find((x) => x.id === id);
  if (!d) throw new Error('Değişiklik bulunamadı');
  const secilen = new Set(form.getAll('tesis_id').map(String));
  const [tesisler, gruplar, mevcut] = await Promise.all([depo.tesisler(), depo.sektorGruplari(), depo.gorevler({ mevzuatDegisikligiId: id })]);
  const acilmis = new Set(mevcut.map((g) => g.tesis_id));
  const adaylar = etkilenenTesisler(d, tesisler, gruplar.map((g) => g.kod)).filter((e) => secilen.has(e.tesis.id) && !acilmis.has(e.tesis.id));
  const sonTarih = al(form, 'son_tarih', TARIH);
  const baslik = al(form, 'baslik') ?? d.aksiyon ?? `${d.ad}: uygunluk kontrolü`;
  for (const { tesis } of adaylar) {
    await depo.gorevEkle({
      baslik: `${baslik} — ${tesis.gt_kod} ${tesis.kisa_ad}`.slice(0, 300),
      aciklama: [`Mevzuat değişikliği: ${d.ad}`, d.rg_metin && `RG: ${d.rg_metin}`, d.ozet].filter(Boolean).join('\n'),
      sorumlu_id: tesis.sorumlu_id ?? kullanici.id,
      son_tarih: sonTarih,
      tesis_id: tesis.id,
      kaynak: 'mevzuat',
      mevzuat_degisikligi_id: id,
    });
  }
  yenile();
}

function mevzuatAlanlari(form: FormData) {
  const rg = al(form, 'rg_metin');
  const m = rg ? /(\d{2})\.(\d{2})\.(\d{4})\s*\/\s*(\d+)/.exec(rg) : null;
  return {
    kategori: al(form, 'kategori'),
    tur: al(form, 'tur'),
    ad: al(form, 'ad', undefined, true)!,
    rg_metin: rg,
    rg_tarih: m ? `${m[3]}-${m[2]}-${m[1]}` : null,
    rg_sayi: m ? m[4] : null,
    teyit_gerekli: form.get('teyit_gerekli') === 'on',
    kapsam_notu: al(form, 'kapsam_notu'),
  };
}

export async function mevzuatEkle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = await depo.mevzuatEkle(mevzuatAlanlari(form));
  yenile();
  redirect(`/mevzuat/${id}`);
}

export async function mevzuatGuncelle(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = al(form, 'id', UUID, true)!;
  await depo.mevzuatGuncelle(id, mevzuatAlanlari(form));
  const gruplar = await depo.sektorGruplari();
  const mevcut = new Map((await depo.mevzuatMatrisi(id)).map((h) => [h.grup_kod, h.uygulama]));
  for (const g of gruplar) {
    const v = String(form.get(`matris_${g.kod}`) ?? '');
    const yeni = v === 'X' || v === 'K' ? v : null;
    if ((mevcut.get(g.kod) ?? null) !== yeni) await depo.matrisAyarla(id, g.kod, yeni);
  }
  yenile();
}
