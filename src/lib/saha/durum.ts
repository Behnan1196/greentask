import type { BulguOnemi, SahaZiyareti } from '@/lib/veri/tipler';

export const ZIYARET_DURUMU: Record<SahaZiyareti['durum'], { ad: string; sinif: string }> = {
  planli: { ad: 'Planlı', sinif: 'bg-mavi-zemin text-mavi' },
  yapildi: { ad: 'Yapıldı · rapor bekliyor', sinif: 'bg-turuncu-zemin text-turuncu' },
  raporlandi: { ad: 'Raporlandı', sinif: 'bg-yesil-acik text-yesil-koyu' },
  iptal: { ad: 'İptal', sinif: 'bg-gri-zemin text-soluk' },
};

export const ONEM: Record<BulguOnemi, { ad: string; sinif: string }> = {
  yuksek: { ad: 'Yüksek', sinif: 'bg-kirmizi-zemin text-kirmizi' },
  orta: { ad: 'Orta', sinif: 'bg-turuncu-zemin text-turuncu' },
  dusuk: { ad: 'Düşük', sinif: 'bg-gri-zemin text-gri' },
  uygun: { ad: 'Uygun', sinif: 'bg-yesil-acik text-yesil-koyu' },
};
