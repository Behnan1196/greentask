// Ekran ve raporda ortak kullanılan adlar ve biçimler.
import type { SinirYaklasimi } from '@/lib/veri/tipler';
import type { Faaliyet, VeriKalitesi } from './motor';

export const VERI_KALITESI_ADI: Record<VeriKalitesi, string> = {
  olcum: 'Sayaç / ölçüm',
  fatura: 'Fatura / belge',
  hesap: 'Hesaplanmış',
  tahmin: 'Tahmin',
};

export const TUR_ADI: Record<Faaliyet['tur'], string> = {
  sabit_yanma: 'Sabit yanma (kazan, fırın, jeneratör)',
  mobil_yanma: 'Şirket taşıtları',
  kacak: 'Soğutucu ve F-gaz kaçakları',
  elektrik: 'Şebeke elektriği',
  defra: 'Kapsam 3 · kütüphane faktörü',
  ozel: 'Özel faktörlü kalem',
};

export const SINIR_ADI: Record<SinirYaklasimi, string> = {
  operasyonel_kontrol: 'Operasyonel kontrol',
  finansal_kontrol: 'Finansal kontrol',
  hisse_payi: 'Hisse payı',
};

/** kg CO₂e → "12,35" (ton) */
export const ton = (kg: number, basamak = 2) =>
  (kg / 1000).toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak });

export const yuzde = (oran: number, basamak = 1) =>
  `±%${(oran * 100).toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak })}`;

export const pay = (x: number, toplam: number) => (toplam ? `%${((x / toplam) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}` : '—');
