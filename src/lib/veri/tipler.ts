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
  sorumlu_id: string | null;
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
  Pick<TesisYukumlulukSatiri, 'durum' | 'gecerlilik_bitis' | 'belge_tarihi' | 'son_islem' | 'baslangic' | 'notlar' | 'sorumlu_id'>
>;

export type GorevDurumu = 'acik' | 'devam' | 'tamamlandi' | 'iptal';

export type Gorev = {
  id: string;
  baslik: string;
  aciklama: string | null;
  sorumlu_id: string | null;
  son_tarih: string | null;
  durum: GorevDurumu;
  kaynak: string;
  tesis_id: string | null;
  toplanti_id: string | null;
  toplanti_maddesi_id: string | null;
  created_at: string;
};

export type YeniGorev = Pick<Gorev, 'baslik' | 'aciklama' | 'sorumlu_id' | 'son_tarih' | 'tesis_id'> &
  Partial<Pick<Gorev, 'toplanti_id' | 'toplanti_maddesi_id' | 'kaynak'>>;

export type Toplanti = {
  id: string;
  tarih: string;
  baslik: string;
  notlar: string | null;
  durum: 'acik' | 'kapandi';
  created_at: string;
};

export type ToplantiMaddesi = {
  id: string;
  toplanti_id: string;
  baslik: string;
  karar: string | null;
  tesis_id: string | null;
  tesis_yukumluluk_id: string | null;
  kaynak: 'elle' | 'sistem' | 'mevzuat';
  sira: number;
};

export type YeniMadde = Pick<ToplantiMaddesi, 'toplanti_id' | 'baslik' | 'kaynak'> &
  Partial<Pick<ToplantiMaddesi, 'karar' | 'tesis_id' | 'tesis_yukumluluk_id'>>;

export type GorevFiltresi = { sorumluId?: string; acik?: boolean; toplantiId?: string; toplantidan?: boolean };

/** Takvim aboneliği için oturumsuz okunan veri paketi. */
export type TakvimVerisi = {
  kullanici: { id: string; ad_soyad: string };
  tesisler: Tesis[];
  turler: YukumlulukTuruSatiri[];
  kayitlar: TesisYukumlulukSatiri[];
  olaylar: OlaySatiri[];
  gorevler: Gorev[];
};

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
  kullanicilar(): Promise<Kullanici[]>;
  tesisSorumlusuAta(tesisId: string, kullaniciId: string | null): Promise<void>;
  gorevler(filtre: GorevFiltresi): Promise<Gorev[]>;
  gorevEkle(g: YeniGorev): Promise<void>;
  toplantilar(): Promise<Toplanti[]>;
  toplanti(id: string): Promise<Toplanti | null>;
  toplantiOlustur(t: Pick<Toplanti, 'tarih' | 'baslik'>): Promise<string>;
  toplantiGuncelle(id: string, alanlar: Partial<Pick<Toplanti, 'notlar' | 'durum'>>): Promise<void>;
  maddeler(toplantiId: string): Promise<ToplantiMaddesi[]>;
  maddeEkle(m: YeniMadde): Promise<void>;
  maddeGuncelle(id: string, alanlar: Partial<Pick<ToplantiMaddesi, 'baslik' | 'karar'>>): Promise<void>;
  maddeSil(id: string): Promise<void>;
  gorevDurumu(id: string, durum: GorevDurumu): Promise<void>;
  takvimAnahtari(yenile?: boolean): Promise<string>;
}
