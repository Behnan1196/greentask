// Kurumsal sera gazı envanteri hesap motoru — TS EN ISO 14064-1:2018 kategorileri, GHG Protocol kapsam eşlemesi.
// Saf fonksiyon: aynı girdi her zaman aynı sonucu verir; her satır hesabın adımlarını ve kaynaklarını taşır.
import { DEFRA, DEFRA_BELIRSIZLIK, YAKIT_WTT, defraAdi, defraBirimi, defraFaktoru } from './defra';
import { elektrikFaktoru, type Baglanti } from './elektrik';
import { GWP, sogutucuGwp, yuvarla, type GwpSeti } from './gwp';
import type { KaynakKodu } from './kaynaklar';
import {
  DOGALGAZ_ALT_UST_ORANI,
  KCAL_TJ,
  KWH_TJ,
  YAKITLAR,
  type AracTipi,
  type Sektor,
  type YakitBirimi,
  type YakitKodu,
} from './yakitlar';

export const MOTOR_SURUMU = '1.0.0';

import type { IsoKategori } from './adlar';
export type { IsoKategori } from './adlar';
export type VeriKalitesi = 'olcum' | 'fatura' | 'hesap' | 'tahmin';

/** Faaliyet verisinin belirsizliği (oran). Metodoloji varsayımı; bkz. metodoloji dokümanı. */
export const VERI_BELIRSIZLIGI: Record<VeriKalitesi, number> = { olcum: 0.02, fatura: 0.02, hesap: 0.1, tahmin: 0.3 };

export { GHGP_KATEGORI_ADI, ISO_KATEGORI_ADI } from './adlar';

type Ortak = { id: string; aciklama?: string; tesis?: string; veri_kalitesi: VeriKalitesi };

export type Faaliyet = Ortak &
  (
    | {
        tur: 'sabit_yanma';
        yakit: YakitKodu;
        miktar: number;
        birim: YakitBirimi;
        sektor: Sektor;
        /** Tedarikçi / analiz alt ısıl değeri, MJ/kg (verilmezse IPCC varsayılanı). */
        aid?: number;
        /** Sm³ girişinde faturadaki üst ısıl değer, kcal/Sm³. */
        ust_isil_deger?: number;
      }
    | {
        tur: 'mobil_yanma';
        yakit: YakitKodu;
        miktar: number;
        birim: YakitBirimi;
        arac?: AracTipi;
        aid?: number;
        ust_isil_deger?: number;
      }
    | { tur: 'kacak'; gaz: string; miktar_kg: number }
    | { tur: 'elektrik'; miktar_mwh: number; baglanti: Baglanti; yekg_mwh?: number }
    | { tur: 'defra'; faktor_id: string; miktar: number; ghgp_kategori?: number }
    | {
        tur: 'ozel';
        iso_kategori: IsoKategori;
        ghgp_kategori?: number;
        miktar: number;
        birim: string;
        /** kg CO₂e / birim */
        faktor: number;
        faktor_kaynagi: string;
        faktor_belirsizlik?: number;
        /** kg biyojenik CO₂ / birim (toplama girmez, ayrı raporlanır) */
        biyojenik?: number;
      }
  );

export type Ayarlar = { yil: number; gwp: GwpSeti; /** Yanma satırları için tedarik zinciri (WTT) emisyonlarını Kategori 4'e ekle */ yakit_wtt: boolean };

export type Gazlar = { CO2: number; CH4: number; N2O: number; F: number };

export type Satir = {
  id: string;
  kaynak_id: string;
  tur: Faaliyet['tur'] | 'wtt';
  baslik: string;
  iso_kategori: IsoKategori;
  kapsam: 1 | 2 | 3;
  ghgp_kategori?: number;
  gazlar: Gazlar;
  /** CO₂e katkısı gaz bazında; gazlara ayrıştırılamayan faktörler (elektrik, DEFRA, özel) 'diger'de. */
  gaz_co2e: Gazlar & { diger: number };
  co2e: number;
  biyojenik_co2: number;
  /** Kapsam 2 piyasa esaslı (yalnızca elektrik) */
  piyasa_co2e?: number;
  belirsizlik: number;
  izler: string[];
  kaynaklar: KaynakKodu[];
};

export type Sonuc = {
  motor: string;
  ayarlar: Ayarlar;
  satirlar: Satir[];
  toplam: number;
  kategori: Record<IsoKategori, number>;
  kapsam: { 1: number; 2: number; 3: number };
  kapsam2_piyasa: number;
  gaz: Gazlar;
  biyojenik_co2: number;
  belirsizlik: { toplam: number; kategori: Record<IsoKategori, number> };
  uyarilar: string[];
};

const KAPSAM: Record<IsoKategori, 1 | 2 | 3> = { '1': 1, '2': 2, '3': 3, '4': 3, '5': 3, '6': 3 };
const s = (x: number, b = 4) => yuvarla(x, b).toLocaleString('tr-TR', { maximumFractionDigits: b });

/** Yakıt miktarını alt ısıl değer esaslı enerjiye (TJ) çevirir; kullanılan varsayımların belirsizliğini de döndürür. */
function enerji(
  f: { yakit: YakitKodu; miktar: number; birim: YakitBirimi; aid?: number; ust_isil_deger?: number },
  izler: string[],
  kaynaklar: Set<KaynakKodu>,
): { tj: number; u: number } {
  const y = YAKITLAR[f.yakit];
  if (!y.birimler.includes(f.birim)) throw new Error(`${y.ad} için geçersiz birim: ${f.birim}`);
  if (f.yakit === 'dogalgaz') {
    let ustTj: number;
    if (f.birim === 'Sm3') {
      if (!f.ust_isil_deger) throw new Error('Sm³ girişinde faturadaki üst ısıl değer (kcal/Sm³) gerekir');
      ustTj = f.miktar * f.ust_isil_deger * KCAL_TJ;
      izler.push(`${s(f.miktar)} Sm³ × ${s(f.ust_isil_deger)} kcal/Sm³ × 4,1868×10⁻⁹ TJ/kcal = ${s(ustTj, 6)} TJ (üst ısıl değer)`);
    } else {
      const kwh = f.birim === 'kWh' ? f.miktar : f.birim === 'MWh' ? f.miktar * 1000 : f.miktar / 0.0036;
      ustTj = kwh * KWH_TJ;
      izler.push(`${s(f.miktar)} ${f.birim} = ${s(ustTj, 6)} TJ (faturadaki enerji, üst ısıl değer esaslı)`);
    }
    const tj = ustTj * DOGALGAZ_ALT_UST_ORANI;
    izler.push(`Alt ısıl değere çevrim: × ${DOGALGAZ_ALT_UST_ORANI} = ${s(tj, 6)} TJ`);
    kaynaklar.add('IPCC2006_V2_C1');
    return { tj, u: 0.02 };
  }
  let kg: number;
  let u = 0;
  if (f.birim === 'litre') {
    const d = y.yogunluk!;
    kg = f.miktar * d.deger;
    u = d.belirsizlik;
    kaynaklar.add(d.kaynak);
    izler.push(`${s(f.miktar)} L × ${s(d.deger)} kg/L = ${s(kg)} kg`);
  } else kg = f.birim === 'ton' ? f.miktar * 1000 : f.miktar;
  const aid = f.aid ?? y.aid!;
  if (f.aid == null) {
    u = Math.hypot(u, y.aidBelirsizlik ?? 0);
    kaynaklar.add('IPCC2006_V2_C1');
  }
  const tj = (kg / 1e6) * aid;
  izler.push(`${s(kg)} kg × ${s(aid)} MJ/kg${f.aid == null ? ' (IPCC varsayılan alt ısıl değer)' : ' (tedarikçi / analiz değeri)'} = ${s(tj, 6)} TJ`);
  return { tj, u };
}

function yanma(f: Extract<Faaliyet, { tur: 'sabit_yanma' | 'mobil_yanma' }>, ay: Ayarlar): Satir {
  const y = YAKITLAR[f.yakit];
  const izler: string[] = [];
  const kaynaklar = new Set<KaynakKodu>([y.co2Kaynak]);
  const { tj, u: uEnerji } = enerji(f, izler, kaynaklar);
  let ch4: number, n2o: number;
  if (f.tur === 'sabit_yanma') {
    ch4 = y.ch4[f.sektor];
    n2o = y.n2o[f.sektor];
    kaynaklar.add('IPCC2006_V2_C2');
  } else {
    const m = y.mobil;
    if (!m) throw new Error(`${y.ad} karayolu taşıtı yakıtı olarak tanımlı değil`);
    const e = 'ch4' in m ? m : (m[f.arac ?? 'benzin_1995_sonrasi'] ?? m.benzin_1995_sonrasi)!;
    ch4 = e.ch4;
    n2o = e.n2o;
    kaynaklar.add('IPCC2006_V2_C3');
  }
  const co2 = tj * y.co2;
  const gCh4 = tj * ch4;
  const gN2o = tj * n2o;
  const kCh4 = GWP[y.biyokutle ? 'CH4_biyojenik' : 'CH4_fosil'][ay.gwp];
  const kN2o = GWP.N2O[ay.gwp];
  kaynaklar.add('GHGP_GWP_2024');
  izler.push(`CO₂ = ${s(tj, 6)} TJ × ${s(y.co2)} kg/TJ = ${s(co2)} kg${y.biyokutle ? ' (biyojenik, toplama girmez)' : ''}`);
  izler.push(`CH₄ = ${s(tj, 6)} TJ × ${s(ch4)} kg/TJ = ${s(gCh4)} kg × KÜP ${kCh4}`);
  izler.push(`N₂O = ${s(tj, 6)} TJ × ${s(n2o)} kg/TJ = ${s(gN2o)} kg × KÜP ${kN2o}`);
  const co2e = (y.biyokutle ? 0 : co2) + gCh4 * kCh4 + gN2o * kN2o;
  izler.push(`Toplam = ${s(co2e)} kg CO₂e`);
  return {
    id: f.id,
    kaynak_id: f.id,
    tur: f.tur,
    baslik: `${f.tur === 'sabit_yanma' ? 'Sabit yanma' : 'Taşıt yakıtı'} · ${y.ad}`,
    iso_kategori: '1',
    kapsam: 1,
    gazlar: { CO2: y.biyokutle ? 0 : co2, CH4: gCh4, N2O: gN2o, F: 0 },
    gaz_co2e: { CO2: y.biyokutle ? 0 : co2, CH4: gCh4 * kCh4, N2O: gN2o * kN2o, F: 0, diger: 0 },
    co2e,
    biyojenik_co2: y.biyokutle ? co2 : 0,
    belirsizlik: Math.hypot(VERI_BELIRSIZLIGI[f.veri_kalitesi], uEnerji, y.co2Belirsizlik),
    izler,
    kaynaklar: [...kaynaklar],
  };
}

function wtt(f: Extract<Faaliyet, { tur: 'sabit_yanma' | 'mobil_yanma' }>): Satir {
  const tj = enerjiTj(f);
  const df = defraFaktoru(YAKIT_WTT[f.yakit])!;
  const kwh = tj / KWH_TJ;
  const co2e = kwh * df.kgco2e;
  return {
    id: `${f.id}:wtt`,
    kaynak_id: f.id,
    tur: 'wtt',
    baslik: `Yakıt tedarik zinciri (WTT) · ${YAKITLAR[f.yakit].ad}${f.aciklama ? ` (${f.aciklama})` : ''}`,
    iso_kategori: '4',
    kapsam: 3,
    ghgp_kategori: 3,
    gazlar: { CO2: 0, CH4: 0, N2O: 0, F: 0 },
    gaz_co2e: { CO2: 0, CH4: 0, N2O: 0, F: 0, diger: co2e },
    co2e,
    biyojenik_co2: 0,
    belirsizlik: Math.hypot(VERI_BELIRSIZLIGI[f.veri_kalitesi], DEFRA_BELIRSIZLIK),
    izler: [
      `${s(tj, 6)} TJ = ${s(kwh)} kWh (alt ısıl değer)`,
      `${s(kwh)} kWh × ${s(df.kgco2e, 5)} kg CO₂e/kWh (DEFRA ${df.id}: ${defraAdi(df)}) = ${s(co2e)} kg CO₂e`,
    ],
    kaynaklar: ['DEFRA_2026'],
  };
}

/** WTT için enerjiyi iz üretmeden yeniden hesaplar. */
const enerjiTj = (f: Extract<Faaliyet, { tur: 'sabit_yanma' | 'mobil_yanma' }>) => enerji(f, [], new Set()).tj;

function kacak(f: Extract<Faaliyet, { tur: 'kacak' }>, ay: Ayarlar): Satir {
  const g = sogutucuGwp(f.gaz, ay.gwp);
  const co2e = f.miktar_kg * g.gwp;
  return {
    id: f.id,
    kaynak_id: f.id,
    tur: 'kacak',
    baslik: `Soğutucu / F-gaz kaçağı · ${f.gaz}`,
    iso_kategori: '1',
    kapsam: 1,
    gazlar: { CO2: 0, CH4: 0, N2O: 0, F: co2e },
    gaz_co2e: { CO2: 0, CH4: 0, N2O: 0, F: co2e, diger: 0 },
    co2e,
    biyojenik_co2: 0,
    // KÜP değerleri için ayrı belirsizlik uygulanmaz (IPCC tablolarının kabulü); belirsizlik kaçak miktarındadır.
    belirsizlik: VERI_BELIRSIZLIGI[f.veri_kalitesi],
    izler: [g.aciklama, `${s(f.miktar_kg)} kg × ${s(g.gwp, 1)} = ${s(co2e)} kg CO₂e`],
    kaynaklar: g.kaynaklar,
  };
}

function elektrik(f: Extract<Faaliyet, { tur: 'elektrik' }>, ay: Ayarlar, uyarilar: string[]): Satir {
  const ef = elektrikFaktoru(ay.yil);
  if (ef.yil !== ay.yil) uyarilar.push(`Elektrik faktörü ${ay.yil} için yayımlanmamış; ${ef.yil} yılı faktörü kullanıldı.`);
  const t = ef.tuketim[f.baglanti];
  const co2e = f.miktar_mwh * t * 1000;
  const yekg = Math.min(f.yekg_mwh ?? 0, f.miktar_mwh);
  const piyasa = (f.miktar_mwh - yekg) * t * 1000;
  const izler = [
    `${s(f.miktar_mwh)} MWh × ${s(t)} t CO₂e/MWh (${ef.yil}, ${f.baglanti === 'dagitim' ? 'dağıtım' : 'iletim'} hattından bağlı tüketim noktası) = ${s(co2e)} kg CO₂e (konum esaslı)`,
  ];
  if (yekg > 0)
    izler.push(`Piyasa esaslı: YEK-G ile belgelenen ${s(yekg)} MWh sıfır faktörle; kalan ${s(f.miktar_mwh - yekg)} MWh konum faktörüyle = ${s(piyasa)} kg CO₂e`);
  return {
    id: f.id,
    kaynak_id: f.id,
    tur: 'elektrik',
    baslik: 'Şebeke elektriği',
    iso_kategori: '2',
    kapsam: 2,
    gazlar: { CO2: 0, CH4: 0, N2O: 0, F: 0 },
    gaz_co2e: { CO2: 0, CH4: 0, N2O: 0, F: 0, diger: co2e },
    co2e,
    biyojenik_co2: 0,
    piyasa_co2e: piyasa,
    belirsizlik: Math.hypot(VERI_BELIRSIZLIGI[f.veri_kalitesi], ef.belirsizlik),
    izler,
    kaynaklar: [ef.kaynak, 'VARSAYIM'],
  };
}

function defraSatiri(f: Extract<Faaliyet, { tur: 'defra' }>): Satir {
  const df = defraFaktoru(f.faktor_id);
  if (!df) throw new Error(`DEFRA ${DEFRA.yil} kütüphanesinde bulunmayan faktör: ${f.faktor_id}`);
  const co2e = f.miktar * df.kgco2e;
  return {
    id: f.id,
    kaynak_id: f.id,
    tur: 'defra',
    baslik: defraAdi(df),
    iso_kategori: df.iso_kategori,
    kapsam: 3,
    ghgp_kategori: f.ghgp_kategori ?? df.ghgp_kategori,
    gazlar: { CO2: 0, CH4: 0, N2O: 0, F: 0 },
    gaz_co2e: { CO2: 0, CH4: 0, N2O: 0, F: 0, diger: co2e },
    co2e,
    biyojenik_co2: 0,
    belirsizlik: Math.hypot(VERI_BELIRSIZLIGI[f.veri_kalitesi], DEFRA_BELIRSIZLIK),
    izler: [`${s(f.miktar)} ${defraBirimi(df)} × ${s(df.kgco2e, 5)} kg CO₂e/${defraBirimi(df)} (DEFRA ${df.id}) = ${s(co2e)} kg CO₂e`],
    kaynaklar: ['DEFRA_2026'],
  };
}

function ozel(f: Extract<Faaliyet, { tur: 'ozel' }>): Satir {
  const co2e = f.miktar * f.faktor;
  const bio = f.miktar * (f.biyojenik ?? 0);
  const kapsam = KAPSAM[f.iso_kategori];
  return {
    id: f.id,
    kaynak_id: f.id,
    tur: 'ozel',
    baslik: `Özel faktör · ${f.faktor_kaynagi}`,
    iso_kategori: f.iso_kategori,
    kapsam,
    ghgp_kategori: kapsam === 3 ? f.ghgp_kategori : undefined,
    gazlar: { CO2: 0, CH4: 0, N2O: 0, F: 0 },
    gaz_co2e: { CO2: 0, CH4: 0, N2O: 0, F: 0, diger: co2e },
    co2e,
    biyojenik_co2: bio,
    belirsizlik: Math.hypot(VERI_BELIRSIZLIGI[f.veri_kalitesi], f.faktor_belirsizlik ?? 0.3),
    izler: [`${s(f.miktar)} ${f.birim} × ${s(f.faktor, 6)} kg CO₂e/${f.birim} (${f.faktor_kaynagi}) = ${s(co2e)} kg CO₂e`],
    kaynaklar: ['VARSAYIM'],
  };
}

const bosKategori = (): Record<IsoKategori, number> => ({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 });

/** Envanteri hesaplar. Toplamlar kg CO₂e; belirsizlik %95 güven aralığının yarı genişliği (oran). */
export function hesapla(faaliyetler: Faaliyet[], ayarlar: Ayarlar): Sonuc {
  const uyarilar: string[] = [];
  const satirlar: Satir[] = [];
  for (const f of faaliyetler) {
    if (!(('miktar' in f ? f.miktar : 'miktar_kg' in f ? f.miktar_kg : f.miktar_mwh) >= 0)) throw new Error(`Geçersiz miktar: ${f.id}`);
    switch (f.tur) {
      case 'sabit_yanma':
      case 'mobil_yanma': {
        const r = yanma(f, ayarlar);
        satirlar.push(r);
        if (ayarlar.yakit_wtt) satirlar.push(wtt(f));
        if (f.yakit === 'linyit' && f.aid == null) uyarilar.push(`${f.aciklama || f.id}: linyit için IPCC varsayılan ısıl değeri çok geniş aralıklı; tedarikçi analiz değeri girilmeli.`);
        break;
      }
      case 'kacak':
        satirlar.push(kacak(f, ayarlar));
        break;
      case 'elektrik':
        satirlar.push(elektrik(f, ayarlar, uyarilar));
        break;
      case 'defra':
        satirlar.push(defraSatiri(f));
        break;
      case 'ozel':
        satirlar.push(ozel(f));
        break;
    }
  }
  const kategori = bosKategori();
  const kareler = bosKategori();
  const kapsam = { 1: 0, 2: 0, 3: 0 };
  const gaz: Gazlar = { CO2: 0, CH4: 0, N2O: 0, F: 0 };
  let piyasa = 0;
  let bio = 0;
  for (const r of satirlar) {
    kategori[r.iso_kategori] += r.co2e;
    kareler[r.iso_kategori] += (r.co2e * r.belirsizlik) ** 2;
    kapsam[r.kapsam] += r.co2e;
    if (r.kapsam === 2) piyasa += r.piyasa_co2e ?? r.co2e;
    gaz.CO2 += r.gazlar.CO2;
    gaz.CH4 += r.gazlar.CH4;
    gaz.N2O += r.gazlar.N2O;
    gaz.F += r.gazlar.F;
    bio += r.biyojenik_co2;
  }
  const toplam = satirlar.reduce((t, r) => t + r.co2e, 0);
  const uKat = bosKategori();
  for (const k of Object.keys(kategori) as IsoKategori[]) uKat[k] = kategori[k] ? Math.sqrt(kareler[k]) / kategori[k] : 0;
  const uTop = toplam ? Math.sqrt(Object.values(kareler).reduce((a, b) => a + b, 0)) / toplam : 0;
  if ([...new Set(satirlar.map((r) => r.id))].length !== satirlar.length) throw new Error('Faaliyet kimlikleri benzersiz olmalı');
  return {
    motor: MOTOR_SURUMU,
    ayarlar,
    satirlar,
    toplam,
    kategori,
    kapsam,
    kapsam2_piyasa: piyasa,
    gaz,
    biyojenik_co2: bio,
    belirsizlik: { toplam: uTop, kategori: uKat },
    uyarilar,
  };
}
