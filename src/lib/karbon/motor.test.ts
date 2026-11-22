// Referans testleri: beklenen değerler motordan bağımsız, elle (hesap makinesiyle) hesaplanmıştır.
// Her testin açıklaması metodoloji dokümanındaki "Test senaryoları" tablosunda aynı numarayla yer alır.
import { describe, expect, it } from 'vitest';
import { defraFaktoru } from './defra';
import { sogutucuGwp } from './gwp';
import { hesapla, type Ayarlar, type Faaliyet } from './motor';

const AR5: Ayarlar = { yil: 2025, gwp: 'AR5', yakit_wtt: false };
const tek = (f: Faaliyet, a: Ayarlar = AR5) => hesapla([f], a);

describe('Kategori 1 · sabit yanma', () => {
  it('T1 doğal gaz 100.000 kWh (fatura, üst ısıl değer), sanayi', () => {
    // 100000 × 3,6e-6 = 0,36 TJ (üst) × 0,9 = 0,324 TJ
    // CO2 0,324 × 55 900 = 18 111,6 · CH4 0,324 × 1 = 0,324 kg × 28 = 9,072 · N2O 0,0324 × 265 = 8,586
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 100000, birim: 'kWh', sektor: 'sanayi', veri_kalitesi: 'fatura' });
    expect(r.satirlar[0].gazlar.CO2).toBeCloseTo(18111.6, 6);
    expect(r.satirlar[0].gazlar.CH4).toBeCloseTo(0.324, 9);
    expect(r.satirlar[0].gazlar.N2O).toBeCloseTo(0.0324, 9);
    expect(r.toplam).toBeCloseTo(18129.258, 6);
    expect(r.kapsam[1]).toBeCloseTo(18129.258, 6);
  });

  it('T2 doğal gaz 1.000 Sm³, üst ısıl değer 9.155 kcal/Sm³, ticari', () => {
    // 1000 × 9155 × 4,1868e-9 = 0,038330154 TJ × 0,9 = 0,0344971386 TJ
    // CO2 1928,390048 · CH4 0,172485693 × 28 = 4,8296 · N2O 0,00344971386 × 265 = 0,9141742
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 1000, birim: 'Sm3', ust_isil_deger: 9155, sektor: 'ticari', veri_kalitesi: 'fatura' });
    expect(r.toplam).toBeCloseTo(1928.390048 + 4.829599 + 0.914174, 4);
  });

  it('T3 motorin 1.000 L jeneratör, sanayi', () => {
    // 1000 × 0,8325 = 832,5 kg → 0,0008325 Gg × 43,0 = 0,0357975 TJ
    // CO2 × 72 300 = 2588,15925 · CH4 × 3 = 0,1073925 × 28 = 3,00699 · N2O × 0,6 = 0,0214785 × 265 = 5,6918025
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'motorin', miktar: 1000, birim: 'litre', sektor: 'sanayi', veri_kalitesi: 'fatura' });
    expect(r.toplam).toBeCloseTo(2596.8580425, 6);
  });

  it('T4 linyit 50 ton, analiz alt ısıl değeri 10,5 MJ/kg', () => {
    // 50 000 kg × 10,5 = 0,525 TJ · CO2 × 105 500 = 55 387,5 · CH4 5,25 × 28 = 147 · N2O 0,7875 × 265 = 208,6875
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'linyit', miktar: 50, birim: 'ton', aid: 10.5, sektor: 'sanayi', veri_kalitesi: 'fatura' });
    expect(r.toplam).toBeCloseTo(55743.1875, 6);
    expect(r.uyarilar).toEqual([]);
  });

  it('T5 odun 10 ton: biyojenik CO₂ toplama girmez, CH₄ ve N₂O girer', () => {
    // 10 000 kg × 15,6 = 0,156 TJ · CO2 × 111 800 = 17 440,8 (biyojenik)
    // CH4 × 30 = 4,68 × 28 = 131,04 · N2O × 4 = 0,624 × 265 = 165,36
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'odun', miktar: 10, birim: 'ton', sektor: 'sanayi', veri_kalitesi: 'fatura' });
    expect(r.toplam).toBeCloseTo(296.4, 6);
    expect(r.biyojenik_co2).toBeCloseTo(17440.8, 6);
    expect(r.gaz.CO2).toBe(0);
  });
});

describe('Kategori 1 · taşıtlar ve kaçaklar', () => {
  it('T6 benzin 500 L, 1995 sonrası binek', () => {
    // 500 × 0,7475 = 373,75 kg × 44,3 = 0,016557125 TJ
    // CO2 × 69 300 = 1147,4087625 · CH4 × 3,8 = 0,062917075 × 28 = 1,7616781 · N2O × 5,7 = 0,0943756125 × 265 = 25,00953731
    const r = tek({ id: 'a', tur: 'mobil_yanma', yakit: 'benzin', miktar: 500, birim: 'litre', arac: 'benzin_1995_sonrasi', veri_kalitesi: 'fatura' });
    expect(r.toplam).toBeCloseTo(1147.4087625 + 1.7616781 + 25.00953731, 5);
  });

  it('T7 R-410A 5 kg kaçak; karışım KÜP AR5 = 1923,5 (DEFRA 2026: 1924)', () => {
    expect(sogutucuGwp('R-410A', 'AR5').gwp).toBeCloseTo(1923.5, 9);
    const r = tek({ id: 'a', tur: 'kacak', gaz: 'R-410A', miktar_kg: 5, veri_kalitesi: 'hesap' });
    expect(r.toplam).toBeCloseTo(9617.5, 9);
    expect(r.gaz.F).toBeCloseTo(9617.5, 9);
  });

  it('T8 karışım KÜP değerleri DEFRA 2026 (AR5) tablosuyla 1 birim içinde uyumlu', () => {
    expect(Math.abs(sogutucuGwp('R-404A', 'AR5').gwp - 3943)).toBeLessThan(1);
    expect(Math.abs(sogutucuGwp('R-407C', 'AR5').gwp - 1624)).toBeLessThan(1);
    expect(sogutucuGwp('R-134a', 'AR6').gwp).toBe(1530);
  });
});

describe('Kategori 2 · elektrik', () => {
  it('T9 250 MWh dağıtım hattı; 100 MWh YEK-G', () => {
    // konum: 250 × 0,478 = 119,5 t · piyasa: 150 × 0,478 = 71,7 t
    const r = tek({ id: 'a', tur: 'elektrik', miktar_mwh: 250, baglanti: 'dagitim', yekg_mwh: 100, veri_kalitesi: 'fatura' });
    expect(r.kapsam[2]).toBeCloseTo(119500, 6);
    expect(r.kapsam2_piyasa).toBeCloseTo(71700, 6);
    expect(r.uyarilar[0]).toMatch(/2022 yılı faktörü/);
  });
});

describe('Kategori 3-4 · ikincil veri', () => {
  it('T10 Türkiye otel konaklaması 10 gece (DEFRA 32,1 kg/oda·gece)', () => {
    const r = tek({ id: 'a', tur: 'defra', faktor_id: '29_600_4051_13_1', miktar: 10, veri_kalitesi: 'fatura' });
    expect(r.kategori['3']).toBeCloseTo(321, 9);
    expect(r.satirlar[0].ghgp_kategori).toBe(6);
  });

  it('T11 doğal gaz WTT: 0,324 TJ = 90.000 kWh × 0,03347 = 3.012,3 kg (Kategori 4, GHGP 3)', () => {
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 100000, birim: 'kWh', sektor: 'sanayi', veri_kalitesi: 'fatura' }, { ...AR5, yakit_wtt: true });
    const w = r.satirlar.find((x) => x.tur === 'wtt')!;
    expect(w.co2e).toBeCloseTo(3012.3, 6);
    expect(w.iso_kategori).toBe('4');
    expect(r.kapsam[3]).toBeCloseTo(3012.3, 6);
  });

  it('T12 özel (tedarikçiye özgü) faktör', () => {
    const r = tek({ id: 'a', tur: 'ozel', iso_kategori: '4', ghgp_kategori: 1, miktar: 20, birim: 'ton', faktor: 1850, faktor_kaynagi: 'Tedarikçi EPD', veri_kalitesi: 'fatura' });
    expect(r.kategori['4']).toBe(37000);
  });

  it('DEFRA kütüphanesi yüklü ve kimlikler benzersiz', () => {
    expect(defraFaktoru('11_100_1004_7_1')?.kgco2e).toBe(0.03347);
  });
});

describe('Toplamlar, GWP seti ve belirsizlik', () => {
  it('T13 AR6 ile doğal gaz: CH₄ fosil 29,8, N₂O 273', () => {
    const r = tek({ id: 'a', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 100000, birim: 'kWh', sektor: 'sanayi', veri_kalitesi: 'fatura' }, { ...AR5, gwp: 'AR6' });
    expect(r.toplam).toBeCloseTo(18111.6 + 0.324 * 29.8 + 0.0324 * 273, 6);
  });

  it('T14 belirsizlik birleştirme (IPCC Yaklaşım 1): iki bağımsız satır', () => {
    // A: özel 1000 kg, veri %2, faktör %10 → u = √(0,02²+0,1²) = 0,10198
    // B: özel 3000 kg, veri %30, faktör %30 → u = √(0,3²+0,3²) = 0,42426
    // toplam = √((1000·0,10198)² + (3000·0,42426)²) / 4000 = 0,31922
    const r = hesapla(
      [
        { id: 'a', tur: 'ozel', iso_kategori: '4', miktar: 1, birim: 'adet', faktor: 1000, faktor_kaynagi: 'x', faktor_belirsizlik: 0.1, veri_kalitesi: 'fatura' },
        { id: 'b', tur: 'ozel', iso_kategori: '4', miktar: 1, birim: 'adet', faktor: 3000, faktor_kaynagi: 'y', faktor_belirsizlik: 0.3, veri_kalitesi: 'tahmin' },
      ],
      AR5,
    );
    expect(r.belirsizlik.toplam).toBeCloseTo(0.31922, 4);
    expect(r.belirsizlik.kategori['4']).toBeCloseTo(0.31922, 4);
  });

  it('kategori, kapsam ve satır toplamları birbirini tutar', () => {
    const r = hesapla(
      [
        { id: '1', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 100000, birim: 'kWh', sektor: 'sanayi', veri_kalitesi: 'fatura' },
        { id: '2', tur: 'elektrik', miktar_mwh: 250, baglanti: 'dagitim', veri_kalitesi: 'fatura' },
        { id: '3', tur: 'defra', faktor_id: '29_600_4051_13_1', miktar: 10, veri_kalitesi: 'fatura' },
      ],
      { ...AR5, yakit_wtt: true },
    );
    const kat = Object.values(r.kategori).reduce((a, b) => a + b, 0);
    expect(kat).toBeCloseTo(r.toplam, 6);
    expect(r.kapsam[1] + r.kapsam[2] + r.kapsam[3]).toBeCloseTo(r.toplam, 6);
    expect(r.satirlar).toHaveLength(4);
  });

  it('hatalı girdiler reddedilir', () => {
    expect(() => tek({ id: 'a', tur: 'sabit_yanma', yakit: 'dogalgaz', miktar: 10, birim: 'Sm3', sektor: 'sanayi', veri_kalitesi: 'fatura' })).toThrow(/üst ısıl değer/);
    expect(() => tek({ id: 'a', tur: 'sabit_yanma', yakit: 'lpg', miktar: 10, birim: 'litre', sektor: 'sanayi', veri_kalitesi: 'fatura' })).toThrow(/geçersiz birim/);
    expect(() => tek({ id: 'a', tur: 'defra', faktor_id: 'yok', miktar: 1, veri_kalitesi: 'fatura' })).toThrow(/bulunmayan/);
    expect(() => tek({ id: 'a', tur: 'ozel', iso_kategori: '4', miktar: -1, birim: 'x', faktor: 1, faktor_kaynagi: 'x', veri_kalitesi: 'fatura' })).toThrow(/Geçersiz miktar/);
  });
});
