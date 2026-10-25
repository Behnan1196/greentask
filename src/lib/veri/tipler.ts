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
  mevzuat_id: string | null;
};

export type YeniDegisiklik = Omit<MevzuatDegisikligi, 'id' | 'durum'>;

export type Mevzuat = {
  id: string;
  kategori: string | null;
  tur: string | null;
  ad: string;
  rg_metin: string | null;
  rg_tarih: string | null;
  rg_sayi: string | null;
  teyit_gerekli: boolean;
  kapsam_notu: string | null;
};

export type MatrisHucresi = { mevzuat_id: string; grup_kod: string; uygulama: 'X' | 'K' };

export type SektorGrubu = { kod: string; ad: string; aciklama: string | null };

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
  isletme_plani_id: string | null;
  plan_ogesi_id: string | null;
  mevzuat_degisikligi_id: string | null;
  created_at: string;
};

export type YeniGorev = Pick<Gorev, 'baslik' | 'aciklama' | 'sorumlu_id' | 'son_tarih' | 'tesis_id'> &
  Partial<Pick<Gorev, 'toplanti_id' | 'toplanti_maddesi_id' | 'kaynak' | 'isletme_plani_id' | 'plan_ogesi_id' | 'mevzuat_degisikligi_id'>>;

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

export type ZiyaretDurumu = 'planli' | 'yapildi' | 'raporlandi' | 'iptal';

export type SahaZiyareti = {
  id: string;
  tesis_id: string;
  tarih: string;
  ziyaretci_id: string | null;
  amac: string | null;
  durum: ZiyaretDurumu;
  saha_notu: string | null;
  rapor_ozeti: string | null;
};

export type BulguOnemi = 'yuksek' | 'orta' | 'dusuk' | 'uygun';

export type ZiyaretBulgusu = {
  id: string;
  ziyaret_id: string;
  bulgu: string;
  dayanak: string | null;
  onem: BulguOnemi;
  duzeltici_faaliyet: string | null;
  termin: string | null;
  durum: 'acik' | 'kapandi';
  gorev_id: string | null;
  dosya_id: string | null;
  sira: number;
};

export type ZiyaretDosyasi = {
  id: string;
  ziyaret_id: string;
  tur: 'foto' | 'ses' | 'belge';
  yol: string;
  mime: string;
  boyut: number;
  aciklama: string | null;
  created_at: string;
};

export type GorevFiltresi = { sorumluId?: string; acik?: boolean; toplantiId?: string; toplantidan?: boolean; isletmePlaniId?: string; mevzuatDegisikligiId?: string };

export type PlanDurumu = 'taslak' | 'revizyonda' | 'sunuldu' | 'onaylandi';

export type IsletmePlani = {
  id: string;
  baslik: string;
  durum: PlanDurumu;
  onayli_surum: string | null;
  onay_tarihi: string | null;
  sunum_tarihi: string | null;
  hazirlayan_id: string | null;
  notlar: string | null;
  tesis_idleri: string[];
  created_at: string;
};

export type PlanAlanlari = Omit<IsletmePlani, 'id' | 'created_at' | 'tesis_idleri'>;

export type PlanOzeti = { paragraf: number; tablo: number; sekil: number; gorsel: number; bolum: number; bulgu: number };

export type PlanSurumu = {
  id: string;
  plan_id: string;
  dosya_adi: string;
  yol: string;
  boyut: number;
  ozet: Partial<PlanOzeti>;
  created_at: string;
  created_by: string | null;
};

export type OgeDurumu = 'degismedi' | 'kontrol' | 'guncellenecek' | 'eklenecek' | 'tamam';

export type PlanOgesiSatiri = {
  id: string;
  plan_id: string;
  anahtar: string;
  tur: 'bolum' | 'tablo' | 'sekil';
  icerik_turu: 'metin' | 'veri_tablosu' | 'dis_belge' | 'mevzuat_eki';
  numara: string | null;
  ad: string;
  bolum: string | null;
  veri_kaynagi: string | null;
  durum: OgeDurumu;
  notlar: string | null;
  sira: number;
  son_gorulen_surum: string | null;
};

/** Word'den çıkarılan öğe (anahtar ile mevcut kayda eşlenir). */
export type CikanOge = Pick<PlanOgesiSatiri, 'anahtar' | 'tur' | 'icerik_turu' | 'numara' | 'ad' | 'bolum' | 'veri_kaynagi' | 'sira'>;

export type PlanBulgusu = {
  id: string;
  plan_id: string;
  surum_id: string;
  kategori: string;
  onem: 'yuksek' | 'orta' | 'dusuk';
  baslik: string;
  detay: string | null;
  oneri: string | null;
  durum: 'acik' | 'duzeltildi' | 'yoksay';
  sira: number;
};

export type YeniPlanBulgusu = Pick<PlanBulgusu, 'kategori' | 'onem' | 'baslik' | 'detay' | 'oneri'> & { durum?: PlanBulgusu['durum'] };

/** Büyük Word dosyası sunucuyu (Vercel 4,5 MB sınırı) atlayıp doğrudan depoya yüklenir. */
export type YuklemeHedefi = { url: string; yontem: 'PUT' };

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
  degisiklikEkle(d: YeniDegisiklik): Promise<string>;
  degisiklikGuncelle(id: string, alanlar: Partial<Omit<MevzuatDegisikligi, 'id'>>): Promise<void>;
  sektorGruplari(): Promise<SektorGrubu[]>;
  mevzuatlar(): Promise<Mevzuat[]>;
  mevzuat(id: string): Promise<Mevzuat | null>;
  mevzuatEkle(m: Omit<Mevzuat, 'id'>): Promise<string>;
  mevzuatGuncelle(id: string, alanlar: Partial<Omit<Mevzuat, 'id'>>): Promise<void>;
  mevzuatMatrisi(mevzuatId?: string): Promise<MatrisHucresi[]>;
  /** null: o grup için hücreyi siler. */
  matrisAyarla(mevzuatId: string, grupKod: string, uygulama: 'X' | 'K' | null): Promise<void>;
  yukumlulukGuncelle(id: string, alanlar: YukumlulukGuncelleme): Promise<void>;
  olayEkle(o: Omit<OlaySatiri, 'id'>): Promise<void>;
  olaySil(id: string): Promise<void>;
  kullanicilar(): Promise<Kullanici[]>;
  tesisSorumlusuAta(tesisId: string, kullaniciId: string | null): Promise<void>;
  gorevler(filtre: GorevFiltresi): Promise<Gorev[]>;
  gorevEkle(g: YeniGorev): Promise<string>;
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
  ziyaretler(filtre?: { tesisId?: string }): Promise<SahaZiyareti[]>;
  ziyaret(id: string): Promise<SahaZiyareti | null>;
  ziyaretOlustur(z: Pick<SahaZiyareti, 'tesis_id' | 'tarih' | 'ziyaretci_id' | 'amac'>): Promise<string>;
  ziyaretGuncelle(id: string, alanlar: Partial<Omit<SahaZiyareti, 'id' | 'tesis_id'>>): Promise<void>;
  bulgular(ziyaretIdleri: string[]): Promise<ZiyaretBulgusu[]>;
  bulguEkle(b: Omit<ZiyaretBulgusu, 'id' | 'sira' | 'durum' | 'gorev_id'>): Promise<void>;
  bulguGuncelle(id: string, alanlar: Partial<Pick<ZiyaretBulgusu, 'durum' | 'gorev_id'>>): Promise<void>;
  bulguSil(id: string): Promise<void>;
  dosyalar(ziyaretId: string): Promise<ZiyaretDosyasi[]>;
  dosya(id: string): Promise<ZiyaretDosyasi | null>;
  dosyaKaydet(d: Omit<ZiyaretDosyasi, 'id' | 'created_at'>, veri: ArrayBuffer): Promise<void>;
  dosyaIcerigi(yol: string): Promise<ArrayBuffer>;
  dosyaSil(id: string): Promise<void>;
  planlar(): Promise<IsletmePlani[]>;
  plan(id: string): Promise<IsletmePlani | null>;
  planOlustur(p: PlanAlanlari, tesisIdleri: string[]): Promise<string>;
  planGuncelle(id: string, alanlar: Partial<PlanAlanlari>, tesisIdleri?: string[]): Promise<void>;
  planSurumleri(planId: string): Promise<PlanSurumu[]>;
  planSurumu(id: string): Promise<PlanSurumu | null>;
  planYuklemeHedefi(yol: string): Promise<YuklemeHedefi>;
  planDosyasi(yol: string): Promise<ArrayBuffer>;
  /** Büyük dosya için doğrudan (imzalı) indirme adresi; null ise dosya sunucudan akıtılır. */
  planIndirmeAdresi(yol: string, dosyaAdi: string): Promise<string | null>;
  planDosyasiSil(yol: string): Promise<void>;
  /** Sürümü kaydeder, öğeleri anahtarla birleştirir (durum ve notlar korunur), bulguları yazar. */
  surumKaydet(
    s: Pick<PlanSurumu, 'plan_id' | 'dosya_adi' | 'yol' | 'boyut' | 'ozet'>,
    ogeler: CikanOge[],
    bulgular: YeniPlanBulgusu[],
  ): Promise<string>;
  planOgeleri(planId: string): Promise<PlanOgesiSatiri[]>;
  ogeGuncelle(id: string, alanlar: Partial<Pick<PlanOgesiSatiri, 'durum' | 'notlar'>>): Promise<void>;
  planBulgulari(surumId: string): Promise<PlanBulgusu[]>;
  planBulgusuGuncelle(id: string, durum: PlanBulgusu['durum']): Promise<void>;
}
