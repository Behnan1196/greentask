'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Asama, KuralTipi, Parametreler } from '@/lib/termin/motor';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { CezaiRisk } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPLER: KuralTipi[] = ['bitis_tarihi', 'son_islem_periyot', 'sozlesme_takvimi', 'yenilenen_sozlesme', 'donemsel_rapor', 'yillik_sabit_tarih'];
const RISKLER: CezaiRisk[] = ['yok', 'dusuk', 'var', 'yuksek'];

/** Yeni tür için makul başlangıç parametreleri (sonra ekrandan ayarlanır). */
const VARSAYILAN: Record<KuralTipi, Parametreler> = {
  bitis_tarihi: { asamalar: [{ ad: 'Başvuru', gun: 60 }] },
  son_islem_periyot: { periyot_ay: 12, hazirlik_ay: 1, aksiyon_adi: 'Sonraki işlem' },
  sozlesme_takvimi: { ilk_gun: 30, aksiyon_adi: 'gerçekleşme' },
  yenilenen_sozlesme: { sure_yil: 1, yenileme: true, yenileme_yil: 1, hazirlik_gun: 30 },
  donemsel_rapor: { periyot_ay: 6, sunum_gun: 15 },
  yillik_sabit_tarih: { ay: 3, gun_no: 31, hazirlik_gun: 30, aksiyon_adi: 'Sunum' },
};

const metin = (form: FormData, ad: string) => String(form.get(ad) ?? '').trim() || null;
function sayi(form: FormData, ad: string): number | undefined {
  const v = String(form.get(ad) ?? '').trim();
  if (!v) return undefined;
  const n = Number(v.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 3650) throw new Error(`Geçersiz sayı: ${ad}`);
  return n;
}
/** Sayı + birim (gün/ay) çiftini { ay } ya da { gun } olarak döner. */
function sure(form: FormData, ad: string): { ay?: number; gun?: number } {
  const n = sayi(form, `${ad}_deger`);
  if (n == null) return {};
  return form.get(`${ad}_birim`) === 'ay' ? { ay: n } : { gun: n };
}

const yenile = () => revalidatePath('/', 'layout');

async function yonetici() {
  const o = await oturumuDogrula();
  if (o.kullanici.rol !== 'yonetici') throw new Error('Kuralları yalnızca yönetici değiştirebilir');
  return o;
}

/** Formdaki kural alanlarını, mevcut parametrelerin üzerine yazar (bilinmeyen anahtarlar korunur). */
function parametreler(tip: KuralTipi, mevcut: Parametreler, form: FormData): Parametreler {
  const p: Parametreler = { ...mevcut };
  const sil = (...k: (keyof Parametreler)[]) => k.forEach((x) => delete p[x]);
  const ata = <K extends keyof Parametreler>(k: K, v: Parametreler[K] | undefined) => (v == null || v === '' ? delete p[k] : (p[k] = v));
  ata('aksiyon_adi', metin(form, 'aksiyon_adi') ?? undefined);
  p.imzali_nusha = form.get('imzali_nusha') === 'on' || undefined;
  if (!p.imzali_nusha) delete p.imzali_nusha;
  switch (tip) {
    case 'bitis_tarihi': {
      ata('gecerlilik_ay', sayi(form, 'gecerlilik_ay'));
      const asamalar: Asama[] = [];
      for (let i = 0; i < 4; i++) {
        const ad = metin(form, `asama_ad_${i}`);
        const s = sure(form, `asama_${i}`);
        if (ad && (s.ay != null || s.gun != null)) asamalar.push({ ad, ...s });
      }
      ata('asamalar', asamalar.length ? asamalar : undefined);
      break;
    }
    case 'son_islem_periyot': {
      if (!p.atiksu_niteligi) {
        sil('periyot_ay', 'periyot_gun');
        const per = sure(form, 'periyot');
        if (per.ay != null) p.periyot_ay = per.ay;
        if (per.gun != null) p.periyot_gun = per.gun;
      }
      sil('hazirlik_ay', 'hazirlik_gun');
      const h = sure(form, 'hazirlik');
      if (h.ay != null) p.hazirlik_ay = h.ay;
      if (h.gun != null) p.hazirlik_gun = h.gun;
      break;
    }
    case 'sozlesme_takvimi':
      ata('ilk_gun', sayi(form, 'ilk_gun'));
      ata('hazirlik_gun', sayi(form, 'hazirlik_gun'));
      break;
    case 'yenilenen_sozlesme':
      ata('sure_yil', sayi(form, 'sure_yil'));
      p.yenileme = form.get('yenileme') === 'on';
      ata('yenileme_yil', sayi(form, 'yenileme_yil'));
      ata('hazirlik_gun', sayi(form, 'hazirlik_gun'));
      break;
    case 'donemsel_rapor':
      ata('periyot_ay', sayi(form, 'periyot_ay'));
      ata('sunum_gun', sayi(form, 'sunum_gun'));
      break;
    case 'yillik_sabit_tarih': {
      const ay = sayi(form, 'ay');
      const gun = sayi(form, 'gun_no');
      if (ay != null && (ay < 1 || ay > 12)) throw new Error('Ay 1–12 arasında olmalı');
      if (gun != null && (gun < 1 || gun > 31)) throw new Error('Gün 1–31 arasında olmalı');
      ata('ay', ay);
      ata('gun_no', gun);
      ata('hazirlik_gun', sayi(form, 'hazirlik_gun'));
      p.onay_gerekli = form.get('onay_gerekli') === 'on' || undefined;
      if (!p.onay_gerekli) delete p.onay_gerekli;
      break;
    }
  }
  return p;
}

export async function turOlustur(form: FormData) {
  const { depo } = await yonetici();
  const kod = String(form.get('kod') ?? '').trim().toLocaleLowerCase('tr');
  const ad = metin(form, 'ad');
  const tip = String(form.get('kural_tipi')) as KuralTipi;
  if (!/^[a-z0-9_]{2,40}$/.test(kod)) throw new Error('Kod küçük harf, rakam ve alt çizgiden oluşmalı (örn. cbs_beyan)');
  if (!ad || !TIPLER.includes(tip)) throw new Error('Ad ve kural tipi gerekli');
  if (kod === 'kart') throw new Error('“kart” kodu ayrılmış; başka bir kod seçin');
  const turler = await depo.turler({ pasiflerDahil: true });
  await depo.turEkle({
    kod,
    ad,
    kural_tipi: tip,
    parametreler: VARSAYILAN[tip],
    cezai_risk: 'var',
    hedef_klasor: null,
    mevzuat_dayanagi: null,
    aciklama: null,
    sira: Math.max(0, ...turler.map((t) => t.sira)) + 10,
    aktif: true,
  });
  yenile();
  redirect(`/kilavuz/${kod}`);
}

export async function turKaydet(form: FormData) {
  const { depo } = await yonetici();
  const id = String(form.get('id') ?? '');
  const tur = (await depo.turler({ pasiflerDahil: true })).find((t) => t.id === id);
  if (!tur) throw new Error('Tür bulunamadı');
  const risk = String(form.get('cezai_risk')) as CezaiRisk;
  await depo.turGuncelle(id, {
    ad: metin(form, 'ad') ?? tur.ad,
    cezai_risk: RISKLER.includes(risk) ? risk : tur.cezai_risk,
    hedef_klasor: metin(form, 'hedef_klasor'),
    mevzuat_dayanagi: metin(form, 'mevzuat_dayanagi'),
    aciklama: metin(form, 'aciklama'),
    sira: sayi(form, 'sira') ?? tur.sira,
    aktif: form.get('aktif') === 'on',
    parametreler: parametreler(tur.kural_tipi, tur.parametreler, form),
  });
  yenile();
}

/** İş kartı: tür kartı (tur_id) ya da genel kart. Tüm ekip düzenleyebilir. */
export async function isKartiKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = String(form.get('id') ?? '');
  const turId = String(form.get('tur_id') ?? '');
  const baslik = metin(form, 'baslik');
  if (!baslik) throw new Error('Başlık gerekli');
  const yeniId = await depo.isKartiKaydet(
    {
      tur_id: UUID.test(turId) ? turId : null,
      baslik,
      yapilacaklar: metin(form, 'yapilacaklar'),
      istenecekler: metin(form, 'istenecekler'),
      nereye: metin(form, 'nereye'),
      dikkat: metin(form, 'dikkat'),
      sira: sayi(form, 'sira') ?? 100,
    },
    UUID.test(id) ? id : undefined,
  );
  yenile();
  if (!UUID.test(id) && !UUID.test(turId)) redirect(`/kilavuz/kart/${yeniId}`);
}

export async function isKartiSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  const id = String(form.get('id') ?? '');
  if (!UUID.test(id)) throw new Error('Geçersiz istek');
  await depo.isKartiSil(id);
  yenile();
  redirect('/kilavuz');
}
