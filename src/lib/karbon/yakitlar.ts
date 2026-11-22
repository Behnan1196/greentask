// Yakıt özellikleri. CO₂ faktörü: Türkiye NID 2026 Tablo 3.7 (ülkeye özgü, oksidasyon dahil).
// Alt ısıl değer: IPCC 2006 Tablo 1.2 varsayılanı. CH₄ / N₂O: IPCC 2006 Tablo 2.3 (sanayi), 2.4 (ticari), 3.2.2 (karayolu).
// Belirsizlik: IPCC aralıklarının (üst − alt) / 2 / varsayılan oranı; ülkeye özgü CO₂ faktörü için de IPCC aralığı
// temkinli bir üst sınır olarak kullanılır.
import type { KaynakKodu } from './kaynaklar';

export type YakitKodu = 'dogalgaz' | 'motorin' | 'benzin' | 'lpg' | 'fuel_oil' | 'linyit' | 'tas_komuru' | 'petrokok' | 'odun';
export type Sektor = 'sanayi' | 'ticari';
export type AracTipi = 'benzin_1995_sonrasi' | 'benzin_katalitik' | 'benzin_katalizorsuz' | 'diger';

/** Faaliyet verisinin girilebileceği birimler. */
export type YakitBirimi = 'Sm3' | 'kWh' | 'MWh' | 'GJ' | 'litre' | 'kg' | 'ton';

export type Yakit = {
  kod: YakitKodu;
  ad: string;
  biyokutle: boolean;
  /** kg CO₂ / TJ (alt ısıl değer esaslı) */
  co2: number;
  co2Kaynak: KaynakKodu;
  co2Belirsizlik: number;
  /** TJ / Gg (= MJ / kg) */
  aid?: number;
  aidBelirsizlik?: number;
  /** kg / L, litre girişleri için */
  yogunluk?: { deger: number; belirsizlik: number; kaynak: KaynakKodu };
  ch4: Record<Sektor, number>;
  n2o: Record<Sektor, number>;
  /** Karayolu taşıtlarında CH₄ / N₂O (kg/TJ); taşıt tipine göre benzin ayrılır. */
  mobil?: { ch4: number; n2o: number } | Partial<Record<AracTipi, { ch4: number; n2o: number }>>;
  birimler: YakitBirimi[];
};

const aralik = (alt: number, ust: number, varsayilan: number) => (ust - alt) / 2 / varsayilan;

export const YAKITLAR: Record<YakitKodu, Yakit> = {
  dogalgaz: {
    kod: 'dogalgaz',
    ad: 'Doğal gaz',
    biyokutle: false,
    co2: 55900,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(54300, 58300, 56100),
    ch4: { sanayi: 1, ticari: 5 },
    n2o: { sanayi: 0.1, ticari: 0.1 },
    mobil: { ch4: 92, n2o: 3 },
    birimler: ['kWh', 'Sm3', 'MWh', 'GJ'],
  },
  motorin: {
    kod: 'motorin',
    ad: 'Motorin',
    biyokutle: false,
    co2: 72300,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(72600, 74800, 74100),
    aid: 43.0,
    aidBelirsizlik: aralik(41.4, 43.3, 43.0),
    yogunluk: { deger: 0.8325, belirsizlik: 0.0125 / 0.8325, kaynak: 'TS_EN_590' },
    ch4: { sanayi: 3, ticari: 10 },
    n2o: { sanayi: 0.6, ticari: 0.6 },
    mobil: { ch4: 3.9, n2o: 3.9 },
    birimler: ['litre', 'kg', 'ton'],
  },
  benzin: {
    kod: 'benzin',
    ad: 'Benzin',
    biyokutle: false,
    co2: 69300,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(67500, 73000, 69300),
    aid: 44.3,
    aidBelirsizlik: aralik(42.5, 44.8, 44.3),
    yogunluk: { deger: 0.7475, belirsizlik: 0.0275 / 0.7475, kaynak: 'TS_EN_228' },
    ch4: { sanayi: 3, ticari: 10 },
    n2o: { sanayi: 0.6, ticari: 0.6 },
    mobil: {
      benzin_1995_sonrasi: { ch4: 3.8, n2o: 5.7 },
      benzin_katalitik: { ch4: 25, n2o: 8.0 },
      benzin_katalizorsuz: { ch4: 33, n2o: 3.2 },
    },
    birimler: ['litre', 'kg', 'ton'],
  },
  lpg: {
    kod: 'lpg',
    ad: 'LPG',
    biyokutle: false,
    co2: 63100,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(61600, 65600, 63100),
    aid: 47.3,
    aidBelirsizlik: aralik(44.8, 52.2, 47.3),
    ch4: { sanayi: 1, ticari: 5 },
    n2o: { sanayi: 0.1, ticari: 0.1 },
    mobil: { ch4: 62, n2o: 0.2 },
    birimler: ['kg', 'ton'],
  },
  fuel_oil: {
    kod: 'fuel_oil',
    ad: 'Fuel oil',
    biyokutle: false,
    co2: 77000,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(75500, 78800, 77400),
    aid: 40.4,
    aidBelirsizlik: aralik(39.8, 41.7, 40.4),
    ch4: { sanayi: 3, ticari: 10 },
    n2o: { sanayi: 0.6, ticari: 0.6 },
    birimler: ['kg', 'ton'],
  },
  linyit: {
    kod: 'linyit',
    ad: 'Linyit',
    biyokutle: false,
    co2: 105500,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(90900, 115000, 101000),
    aid: 11.9,
    aidBelirsizlik: aralik(5.5, 21.6, 11.9),
    ch4: { sanayi: 10, ticari: 10 },
    n2o: { sanayi: 1.5, ticari: 1.5 },
    birimler: ['ton', 'kg'],
  },
  tas_komuru: {
    kod: 'tas_komuru',
    ad: 'Taş kömürü / ithal kömür',
    biyokutle: false,
    co2: 95600,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(89500, 99700, 94600),
    aid: 25.8,
    aidBelirsizlik: aralik(19.9, 30.5, 25.8),
    ch4: { sanayi: 10, ticari: 10 },
    n2o: { sanayi: 1.5, ticari: 1.5 },
    birimler: ['ton', 'kg'],
  },
  petrokok: {
    kod: 'petrokok',
    ad: 'Petrokok',
    biyokutle: false,
    co2: 97400,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(82900, 115000, 97500),
    aid: 32.5,
    aidBelirsizlik: aralik(29.7, 41.9, 32.5),
    ch4: { sanayi: 3, ticari: 10 },
    n2o: { sanayi: 0.6, ticari: 0.6 },
    birimler: ['ton', 'kg'],
  },
  odun: {
    kod: 'odun',
    ad: 'Odun / odun atığı (biyokütle)',
    biyokutle: true,
    co2: 111800,
    co2Kaynak: 'TR_NID_2026',
    co2Belirsizlik: aralik(95000, 132000, 112000),
    aid: 15.6,
    aidBelirsizlik: aralik(7.9, 31.0, 15.6),
    ch4: { sanayi: 30, ticari: 300 },
    n2o: { sanayi: 4, ticari: 4 },
    birimler: ['ton', 'kg'],
  },
};

/** Doğal gazda alt ısıl değer ≈ 0,90 × üst ısıl değer (IPCC 2006 Cilt 2 Bölüm 1.4.1.2). */
export const DOGALGAZ_ALT_UST_ORANI = 0.9;
export const KCAL_TJ = 4.1868e-9;
export const KWH_TJ = 3.6e-6;
