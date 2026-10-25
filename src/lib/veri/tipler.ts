import type { KayitDurumu, KuralTipi, OlayTuru, Parametreler } from '@/lib/termin/motor';

export type CezaiRisk = 'yok' | 'dusuk' | 'var' | 'yuksek';

export type Kullanici = { id: string; ad_soyad: string; eposta: string | null; rol: 'yonetici' | 'muhendis' };

export type Tesis = {
  id: string;
  gt_kod: string;
  kisa_ad: string;
  resmi_unvan: string | null;
  il: string | null;
  sinif: string | null;
  nace_kodlari: string | null;
  grup_kod: string | null;
  grup_notu: string | null;
  firma_grubu: string | null;
  sozlesme_tarihi: string | null;
  sozlesme_kapsami: string | null;
  izin_lisans_konusu: string | null;
  mevzuat_notu: string | null;
  notlar: string | null;
  aktif: boolean;
};

export type Kisi = {
  id: string;
  tesis_id: string;
  ad_soyad: string;
  gorev: string | null;
  sorumluluklar: string | null;
  telefon: string | null;
  eposta: string | null;
  imza_yetkisi: boolean;
  profil_notu: string | null;
};

export type YukumlulukTuruSatiri = {
  id: string;
  kod: string;
  ad: string;
  kural_tipi: KuralTipi;
  parametreler: Parametreler;
  cezai_risk: CezaiRisk;
  hedef_klasor: string | null;
  mevzuat_dayanagi: string | null;
  aciklama: string | null;
  sira: number;
};

export type OlaySatiri = {
  id: string;
  tesis_yukumluluk_id: string;
  tarih: string;
  tur: OlayTuru;
  aciklama: string | null;
};

export type TesisYukumlulukSatiri = {
  id: string;
  tesis_id: string | null;
  tur_id: string;
  etiket: string;
  durum: KayitDurumu;
  gecerlilik_bitis: string | null;
  belge_tarihi: string | null;
  son_islem: string | null;
  baslangic: string | null;
  parametreler: Parametreler;
  sorumlu_id: string | null;
  notlar: string | null;
};

export type MevzuatDegisikligi = {
  id: string;
  tespit_tarihi: string;
  rg_metin: string | null;
  tur: string | null;
  ad: string;
  ozet: string | null;
  etkilenen_gruplar: string | null;
  etkilenen_tesisler: string | null;
  aksiyon: string | null;
  durum: 'acik' | 'kapali';
};

export type YukumlulukGuncelleme = Partial<
  Pick<TesisYukumlulukSatiri, 'durum' | 'gecerlilik_bitis' | 'belge_tarihi' | 'son_islem' | 'baslangic' | 'notlar'>
>;

/** Veri erişim katmanı: Supabase (gerçek) ve yerel Postgres (yalnızca geliştirme/demo) aynı arayüzü uygular. */
export interface Depo {
  kullanici(): Promise<Kullanici | null>;
  tesisler(): Promise<Tesis[]>;
  tesis(gtKod: string): Promise<Tesis | null>;
  kisiler(tesisId: string): Promise<Kisi[]>;
  turler(): Promise<YukumlulukTuruSatiri[]>;
  yukumlulukler(tesisId?: string): Promise<TesisYukumlulukSatiri[]>;
  olaylar(tesisYukumlulukIdleri?: string[]): Promise<OlaySatiri[]>;
  mevzuatDegisiklikleri(): Promise<MevzuatDegisikligi[]>;
  yukumlulukGuncelle(id: string, alanlar: YukumlulukGuncelleme): Promise<void>;
  olayEkle(o: Omit<OlaySatiri, 'id'>): Promise<void>;
  olaySil(id: string): Promise<void>;
}
