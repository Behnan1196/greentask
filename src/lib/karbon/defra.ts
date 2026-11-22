// DEFRA/DESNZ 2026 Kapsam 3 faktörleri (araclar/defra-faktorleri.py ile üretilen defra-2026.json).
import veri from './defra-2026.json';
import type { YakitKodu } from './yakitlar';

export type DefraFaktoru = {
  id: string;
  grup: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  sutun: string | null;
  birim: string;
  kgco2e: number;
  iso_kategori: '3' | '4';
  ghgp_kategori: number;
};

export const DEFRA = veri as { kaynak: string; yil: number; surum: number; faktorler: DefraFaktoru[] };
const DIZIN = new Map(DEFRA.faktorler.map((f) => [f.id, f]));

export const defraFaktoru = (id: string) => DIZIN.get(id);

/** Kapsam 3 için ikincil veri; kaynak belirsizlik vermediği için metodoloji varsayımı. */
export const DEFRA_BELIRSIZLIK = 0.3;

export const GRUP_ADI: Record<string, string> = {
  'WTT- fuels': 'Yakıtların tedarik zinciri (WTT)',
  'WTT- heat and steam': 'Isı ve buhar tedarik zinciri (WTT)',
  'WTT- bioenergy': 'Biyoyakıtların tedarik zinciri (WTT)',
  'Freighting goods': 'Yük taşımacılığı',
  'WTT- delivery vehs & freight': 'Yük taşımacılığı, yakıt tedarik zinciri (WTT)',
  'Business travel- air': 'İş seyahati, hava yolu',
  'Business travel- land': 'İş seyahati ve personel ulaşımı, kara yolu',
  'Business travel- sea': 'İş seyahati, deniz yolu',
  'WTT- business travel- air': 'Hava yolu seyahati, yakıt tedarik zinciri (WTT)',
  'WTT- business travel- sea': 'Deniz yolu seyahati, yakıt tedarik zinciri (WTT)',
  'WTT- pass vehs & travel- land': 'Kara yolu seyahati, yakıt tedarik zinciri (WTT)',
  'Hotel stay': 'Otel konaklaması',
  Homeworking: 'Evden çalışma',
  'Material use': 'Satın alınan malzemeler',
  'Waste disposal': 'Atık bertarafı',
  'Water supply': 'Şebeke suyu',
  'Water treatment': 'Atık su arıtma',
};

export const BIRIM_ADI: Record<string, string> = {
  'tonne.km': 'ton·km',
  'passenger.km': 'yolcu·km',
  km: 'km',
  tonnes: 'ton',
  litres: 'litre',
  'kWh (Net CV)': 'kWh (alt ısıl değer)',
  'kWh (Gross CV)': 'kWh (üst ısıl değer)',
  kWh: 'kWh',
  'cubic metres': 'm³',
  'Room per night': 'oda·gece',
  'FTE Working Hour': 'tam zamanlı çalışan·saat',
  'FTE Working Year': 'tam zamanlı çalışan·yıl',
  GJ: 'GJ',
};

/** Faktörün okunabilir adı: alt kırılımlar " · " ile. */
export const defraAdi = (f: DefraFaktoru) => [f.l2, f.l3, f.l4, f.sutun].filter(Boolean).join(' · ');
export const defraBirimi = (f: DefraFaktoru) => BIRIM_ADI[f.birim] ?? f.birim;

/** Yakıtların tedarik zinciri (WTT) faktörü, alt ısıl değer esaslı kWh başına. */
export const YAKIT_WTT: Record<YakitKodu, string> = {
  dogalgaz: '11_100_1004_7_1',
  motorin: '11_101_1011_7_1',
  benzin: '11_101_1017_7_1',
  lpg: '11_100_1003_7_1',
  fuel_oil: '11_101_1013_7_1',
  linyit: '11_102_1025_7_1',
  tas_komuru: '11_102_1025_7_1',
  petrokok: '11_102_1029_7_1',
  odun: '12_901_1043_5_1',
};
