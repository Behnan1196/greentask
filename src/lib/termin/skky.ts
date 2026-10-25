// SKKY Numune Alma ve Analiz Metotları Tebliği — iç izleme periyotları
// (Excel "Atıksu Numune Alım Takip" sekmesindeki tablo, RG 10.10.2009/27372).

export type AtiksuNiteligi = 'endustriyel' | 'evsel';

export type IzlemePeriyodu = {
  periyot: string;
  aralikGun: number;
  yillikNumune: number;
  denetimPeriyodu: string;
};

// Alt sınırlar: endüstriyel için debi (m³/gün), evsel için eşdeğer nüfus.
const ENDUSTRIYEL: [number, IzlemePeriyodu][] = [
  [0, { periyot: '4 ayda bir', aralikGun: 122, yillikNumune: 3, denetimPeriyodu: 'Yılda bir' }],
  [51, { periyot: '2 ayda bir', aralikGun: 61, yillikNumune: 6, denetimPeriyodu: '6 ayda bir' }],
  [201, { periyot: 'Ayda bir', aralikGun: 30, yillikNumune: 12, denetimPeriyodu: '4 ayda bir' }],
  [1001, { periyot: '15 günde bir', aralikGun: 15, yillikNumune: 24, denetimPeriyodu: '3 ayda bir' }],
  [10001, { periyot: 'Haftada iki', aralikGun: 4, yillikNumune: 104, denetimPeriyodu: '2 ayda bir' }],
];

const EVSEL: [number, IzlemePeriyodu][] = [
  [2000, { periyot: 'Ayda bir', aralikGun: 30, yillikNumune: 12, denetimPeriyodu: 'Yılda bir' }],
  [10000, { periyot: 'Ayda bir', aralikGun: 30, yillikNumune: 12, denetimPeriyodu: '3 ayda bir' }],
  [50000, { periyot: '15 günde bir', aralikGun: 15, yillikNumune: 24, denetimPeriyodu: '2 ayda bir' }],
  [100000, { periyot: 'Haftada iki', aralikGun: 4, yillikNumune: 104, denetimPeriyodu: 'Ayda bir' }],
];

/** Excel'deki MATCH(..., 1) mantığı: alt sınırı değeri aşmayan en büyük satır. */
export function izlemePeriyodu(nitelik: AtiksuNiteligi, deger: number): IzlemePeriyodu | null {
  const tablo = nitelik === 'endustriyel' ? ENDUSTRIYEL : EVSEL;
  let secilen: IzlemePeriyodu | null = null;
  for (const [alt, p] of tablo) if (deger >= alt) secilen = p;
  return secilen; // evselde E.N. < 2000 → tablo dışı (null)
}
