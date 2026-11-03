// Tesis ve kişi formlarının okunması (eylemler arasında ortak).
import type { KisiAlanlari, TesisAlanlari } from '@/lib/veri/tipler';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TARIH = /^\d{4}-\d{2}-\d{2}$/;
export const GT_KOD = /^GT-\d{3}$/;
const GRUP = /^G\d{1,2}$/;

export function al(form: FormData, ad: string, desen?: RegExp, zorunlu = false): string | null {
  const v = String(form.get(ad) ?? '').trim();
  if (!v) {
    if (zorunlu) throw new Error(`${ad} gerekli`);
    return null;
  }
  if (desen && !desen.test(v)) throw new Error(`Geçersiz değer: ${ad}`);
  return v;
}

export function tesisAlanlari(form: FormData): TesisAlanlari {
  return {
    kisa_ad: al(form, 'kisa_ad', undefined, true)!,
    resmi_unvan: al(form, 'resmi_unvan'),
    il: al(form, 'il'),
    sinif: al(form, 'sinif'),
    nace_kodlari: al(form, 'nace_kodlari'),
    grup_kod: al(form, 'grup_kod', GRUP),
    grup_notu: al(form, 'grup_notu'),
    firma_grubu: al(form, 'firma_grubu'),
    sozlesme_tarihi: al(form, 'sozlesme_tarihi', TARIH),
    sozlesme_kapsami: al(form, 'sozlesme_kapsami'),
    izin_lisans_konusu: al(form, 'izin_lisans_konusu'),
    mevzuat_notu: al(form, 'mevzuat_notu'),
    notlar: al(form, 'notlar'),
  };
}

export function kisiAlanlari(form: FormData): KisiAlanlari {
  return {
    ad_soyad: al(form, 'ad_soyad', undefined, true)!,
    gorev: al(form, 'gorev'),
    sorumluluklar: al(form, 'sorumluluklar'),
    telefon: al(form, 'telefon'),
    eposta: al(form, 'eposta'),
    imza_yetkisi: form.get('imza_yetkisi') === 'on',
    profil_notu: al(form, 'profil_notu'),
    dogum_gunu: al(form, 'dogum_gunu', TARIH),
  };
}

