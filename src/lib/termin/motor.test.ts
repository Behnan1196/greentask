import { describe, expect, it } from 'vitest';
import katalog from './katalog.json';
import { terminHesapla, type TesisYukumlulugu, type YukumlulukTuru } from './motor';
import { ayEkle, gunFarki } from './tarih';
import { izlemePeriyodu } from './skky';

const tur = (kod: string) => katalog.find((k) => k.kod === kod) as unknown as YukumlulukTuru;
const aktif = (k: Partial<TesisYukumlulugu>): TesisYukumlulugu => ({ durum: 'aktif', ...k });
const gerceklesti = (...tarihler: string[]) => tarihler.map((tarih) => ({ tarih, tur: 'gerceklesti' as const }));

describe('tarih', () => {
  it('EDATE gibi ay sonuna kırpar', () => {
    expect(ayEkle('2025-01-31', 1)).toBe('2025-02-28');
    expect(ayEkle('2024-01-31', 1)).toBe('2024-02-29');
    expect(ayEkle('2025-10-15', -3)).toBe('2025-07-15');
    expect(ayEkle('2025-03-31', -1)).toBe('2025-02-28');
  });
  it('gün farkı', () => {
    expect(gunFarki('2026-07-16', '2026-07-09')).toBe(-7);
  });
});

// Excel KOKPİT sekmesi 16.07.2026 tarihinde sabitlenmiş değerler içeriyor.
// Aynı girdilerle motorun aynı "aksiyona kalan gün" değerini üretmesi beklenir.
describe('Excel KOKPİT (16.07.2026) ile karşılaştırma', () => {
  const B = '2026-07-16';
  const vakalar: [string, string, TesisYukumlulugu, { sozlesme_tarihi?: string }, number, number?][] = [
    ['GT-028 Limak Keşan · emisyon', 'emisyon', aktif({ son_islem: '2023-10-15' }), {}, -366],
    ['GT-009 HN Metal Bornova · eğitim', 'egitim', aktif({ olaylar: gerceklesti('2024-12-23') }), { sozlesme_tarihi: '2024-11-11' }, -247],
    ['GT-001 Enerjisa · kapasite', 'kapasite', aktif({ gecerlilik_bitis: '2026-03-07' }), {}, -206],
    ['GT-026 Demkar · eğitim', 'egitim', aktif({}), { sozlesme_tarihi: '2026-02-10' }, -66],
    ['GT-029 Oretec · MSS', 'mss', aktif({ gecerlilik_bitis: '2026-07-09' }), {}, -21, -7],
    ['GT-004 Avdan-Maraş · EAYP', 'eayp', aktif({ gecerlilik_bitis: '2026-08-03' }), {}, -12, 18],
    ['GT-007 Has Niğdeliler · MSS', 'mss', aktif({ gecerlilik_bitis: '2026-07-26' }), {}, -4, 10],
    ['GT-027 Ankara Mangan · MSS', 'mss', aktif({ gecerlilik_bitis: '2026-07-31' }), {}, 1, 15],
    ['GT-029 Oretec · eğitim', 'egitim', aktif({}), { sozlesme_tarihi: '2026-05-01' }, 14],
    ['GT-030 MHR Metal · iç tetkik', 'ic_tetkik', aktif({}), { sozlesme_tarihi: '2026-07-01' }, 15],
    ['GT-011 Anka · iç tetkik', 'ic_tetkik', aktif({ olaylar: gerceklesti('2023-08-24', '2024-08-24', '2025-08-05') }), { sozlesme_tarihi: '2023-08-01' }, 16],
    ['GT-023 Panda · tıbbi atık', 'tibbi_atik', aktif({ baslangic: '2018-09-11' }), {}, 27, 57],
    ['GT-022 Pancast · MSS', 'mss', aktif({ gecerlilik_bitis: '2026-10-24' }), {}, 86, 100],
  ];
  for (const [ad, kod, kayit, tesis, aksiyon, son] of vakalar) {
    it(ad, () => {
      const r = terminHesapla(tur(kod), kayit, tesis, B);
      expect(r.kalanGunAksiyon).toBe(aksiyon);
      if (son !== undefined) expect(r.kalanGunSon).toBe(son);
    });
  }
});

describe('kural tipleri', () => {
  it('GFB: ön hazırlık geçtiyse başvuru aşaması gösterilir', () => {
    const r = terminHesapla(tur('gfb_izin'), aktif({ gecerlilik_bitis: '2027-10-09' }), {}, '2027-03-01');
    // 240 gün önce = 2027-02-11 (geçti), 180 gün önce = 2027-04-12
    expect(r.aksiyonAdi).toBe('Başvuru');
    expect(r.aksiyonTarihi).toBe('2027-04-12');
    expect(r.durum).toBe('yaklasiyor');
  });

  it('EAYP sunulduysa süreçte sayılır, gecikmiş görünmez', () => {
    const r = terminHesapla(
      tur('eayp'),
      aktif({
        gecerlilik_bitis: '2026-08-03',
        olaylar: [
          { tarih: '2026-07-02', tur: 'sunuldu' },
          { tarih: '2026-07-06', tur: 'eksiklik_geldi' },
        ],
      }),
      {},
      '2026-10-25',
    );
    expect(r.durum).toBe('surecte');
  });

  it('tesise özel parametre türün varsayılanını ezer (EAYP 3 ay önce sunum)', () => {
    const r = terminHesapla(tur('eayp'), aktif({ gecerlilik_bitis: '2027-04-12', parametreler: { asamalar: [{ ad: 'Sunum', ay: 3 }] } }), {}, '2026-10-25');
    expect(r.aksiyonTarihi).toBe('2027-01-12');
  });

  it('BKKR: bitiş yoksa ruhsat tarihi + 36 ay', () => {
    const r = terminHesapla(tur('bkkr'), aktif({ belge_tarihi: '2023-08-12' }), {}, '2026-07-01');
    expect(r.sonTarih).toBe('2026-08-12');
    expect(r.aksiyonTarihi).toBe('2026-06-12');
    expect(r.durum).toBe('gecikti');
  });

  it('atıksu numunesi: 85 m³/gün endüstriyel → 2 ayda bir (61 gün)', () => {
    expect(izlemePeriyodu('endustriyel', 85)?.aralikGun).toBe(61);
    expect(izlemePeriyodu('endustriyel', 300)?.aralikGun).toBe(30);
    expect(izlemePeriyodu('evsel', 1500)).toBeNull();
    const r = terminHesapla(tur('atiksu_numune'), aktif({ son_islem: '2026-06-03', parametreler: { debi_veya_en: 85 } }), {}, '2026-07-16');
    expect(r.sonTarih).toBe('2026-08-03');
  });

  it('son işlem olaylardan da okunur (en yenisi geçerli)', () => {
    const r = terminHesapla(tur('depo_gazi'), aktif({ son_islem: '2026-01-10', olaylar: gerceklesti('2026-03-12') }), {}, '2026-03-20');
    expect(r.sonTarih).toBe('2026-04-12');
  });

  it('iç tetkik: aynı gün girilmiş mükerrer kayıt bir kez sayılır', () => {
    const r = terminHesapla(tur('ic_tetkik'), aktif({ olaylar: gerceklesti('2024-05-24', '2026-04-30', '2026-04-30') }), { sozlesme_tarihi: '2024-05-01' }, '2026-07-16');
    // Excel mükerrer satırı 3. tetkik sayıp sonrakini 2027'ye atıyordu; gerçekte 3. tetkik 01.05.2026'da gecikmiş.
    expect(r.aksiyonAdi).toBe('3. iç tetkik');
    expect(r.sonTarih).toBe('2026-05-01');
    expect(r.durum).toBe('gecikti');
  });

  it('yenileme maddesi olmayan sözleşme süresi dolunca gecikmiş', () => {
    const r = terminHesapla(tur('tibbi_atik'), aktif({ baslangic: '2025-01-01', parametreler: { yenileme: false } }), {}, '2026-03-01');
    expect(r.durum).toBe('gecikti');
    expect(r.aciklama).toMatch(/yenilenmedi/);
  });

  it('otomatik yenilenen sözleşme bir sonraki yıldönümünü bulur', () => {
    const r = terminHesapla(tur('bitkisel_atik_yag'), aktif({ baslangic: '2017-03-14' }), {}, '2026-10-25');
    expect(r.sonTarih).toBe('2027-03-14');
  });

  it('ÇED: iki rapor sunulduysa 3. dönem', () => {
    const r = terminHesapla(
      tur('ced_izleme'),
      aktif({ baslangic: '2025-04-23', olaylar: [{ tarih: '2025-11-07', tur: 'sunuldu' }, { tarih: '2026-05-07', tur: 'sunuldu' }] }),
      {},
      '2026-10-25',
    );
    // 3. dönem sonu = 2025-04-23 + 18 ay = 2026-10-23, + 15 gün
    expect(r.sonTarih).toBe('2026-11-07');
    expect(r.aksiyonAdi).toBe('3. dönem raporu');
  });

  it('atık beyanı: bu yılın beyanı verildiyse bir sonraki yıl', () => {
    const t = tur('atik_beyani');
    expect(terminHesapla(t, aktif({}), {}, '2026-10-25').sonTarih).toBe('2027-03-31');
    expect(terminHesapla(t, aktif({ olaylar: gerceklesti('2027-03-20') }), {}, '2027-03-25').sonTarih).toBe('2028-03-31');
  });

  it('muaf / veri eksik', () => {
    expect(terminHesapla(tur('egitim'), { durum: 'muaf' }, {}, '2026-10-25').durum).toBe('muaf');
    expect(terminHesapla(tur('emisyon'), aktif({}), {}, '2026-10-25').durum).toBe('veri_eksik');
  });
});
