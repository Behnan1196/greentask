// Hesap motorunun kullandığı her sayının dayandığı kaynaklar. Raporda ve metodoloji dokümanında
// "Kaynaklar" bölümü buradan üretilir; bir faktör yalnızca buradaki bir kaynağa atıfla tanımlanabilir.

export type KaynakKodu =
  | 'IPCC2006_V2_C1'
  | 'IPCC2006_V2_C2'
  | 'IPCC2006_V2_C3'
  | 'TR_NID_2026'
  | 'ETKB_2022'
  | 'GHGP_GWP_2024'
  | 'ASHRAE34'
  | 'DEFRA_2026'
  | 'TS_EN_590'
  | 'TS_EN_228'
  | 'VARSAYIM';

export type Kaynak = { kod: KaynakKodu; ad: string; url?: string; not?: string };

export const KAYNAKLAR: Record<KaynakKodu, Kaynak> = {
  IPCC2006_V2_C1: {
    kod: 'IPCC2006_V2_C1',
    ad: '2006 IPCC Guidelines for National Greenhouse Gas Inventories, Cilt 2 Enerji, Bölüm 1 (Tablo 1.2 varsayılan alt ısıl değerler, Tablo 1.4 varsayılan CO₂ emisyon faktörleri ve aralıkları)',
    url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf',
  },
  IPCC2006_V2_C2: {
    kod: 'IPCC2006_V2_C2',
    ad: '2006 IPCC Guidelines, Cilt 2 Enerji, Bölüm 2 Sabit Yanma (Tablo 2.3 imalat sanayi ve inşaat, Tablo 2.4 ticari/kurumsal — CH₄ ve N₂O)',
    url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf',
  },
  IPCC2006_V2_C3: {
    kod: 'IPCC2006_V2_C3',
    ad: '2006 IPCC Guidelines, Cilt 2 Enerji, Bölüm 3 Hareketli Yanma (Tablo 3.2.1 ve 3.2.2 karayolu)',
    url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_3_Ch3_Mobile_Combustion.pdf',
  },
  TR_NID_2026: {
    kod: 'TR_NID_2026',
    ad: 'Türkiye Ulusal Envanter Dokümanı (NID) 2026, 1990–2024 — Tablo 3.7 yakıtların CO₂ emisyon faktörleri (2024, ülkeye özgü)',
    url: 'https://unfccc.int/documents/656425',
  },
  ETKB_2022: {
    kod: 'ETKB_2022',
    ad: 'Enerji ve Tabii Kaynaklar Bakanlığı, 2022 Yılı Türkiye Elektrik Üretimi ve Tüketim Noktası Emisyon Faktörleri (ETKB-EVÇED-FRM-042 Rev.01, hesaplama yayımı 06.12.2024)',
    url: 'https://enerji.gov.tr//Media/Dizin/EVCED/tr/ÇevreVeİklim/İklimDeğişikliği/EmisyonFaktorleri/2022_Uretim_Tuketim_EF.pdf',
    not: 'Yayımlanmış en güncel yıl 2022. Yeni yıl yayımlandığında faktör kütüphanesine yeni sürüm olarak eklenmeli.',
  },
  GHGP_GWP_2024: {
    kod: 'GHGP_GWP_2024',
    ad: 'GHG Protocol, Global Warming Potential Values (Ağustos 2024) — IPCC AR5 ve AR6 100 yıllık KÜP değerleri',
    url: 'https://ghgprotocol.org/sites/default/files/2024-08/Global-Warming-Potential-Values%20%28August%202024%29.pdf',
  },
  ASHRAE34: {
    kod: 'ASHRAE34',
    ad: 'ANSI/ASHRAE Standard 34, soğutucu karışımlarının kütlece bileşimleri',
    not: 'Karışımın KÜP değeri bileşenlerin kütle oranıyla ağırlıklandırılır; sonuç DEFRA 2026 AR5 değerleriyle karşılaştırılarak test edilmiştir.',
  },
  DEFRA_2026: {
    kod: 'DEFRA_2026',
    ad: 'UK Government GHG Conversion Factors for Company Reporting 2026 (DESNZ/DEFRA), düz dosya sürüm 1.2',
    url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026',
    not: 'Birleşik Krallık verisine dayanır; Türkiye için ülkeye özgü veri bulunmayan Kapsam 3 kalemlerinde ikincil veri olarak kullanılır.',
  },
  TS_EN_590: {
    kod: 'TS_EN_590',
    ad: 'TS EN 590 Motorin — 15 °C yoğunluk aralığı 820–845 kg/m³',
    not: 'Litre ile girilen motorin için aralığın orta noktası (0,8325 kg/L) kullanılır; tedarikçi yoğunluğu biliniyorsa girilmelidir.',
  },
  TS_EN_228: {
    kod: 'TS_EN_228',
    ad: 'TS EN 228 Kurşunsuz benzin — 15 °C yoğunluk aralığı 720–775 kg/m³',
    not: 'Litre ile girilen benzin için aralığın orta noktası (0,7475 kg/L) kullanılır.',
  },
  VARSAYIM: {
    kod: 'VARSAYIM',
    ad: 'Metodoloji varsayımı',
    not: 'Değerlendirici tarafından gözden geçirilmesi gereken, kaynağı bir standart ya da resmî yayın olmayan kabul.',
  },
};
