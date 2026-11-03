// Saha ziyaretinde tesis dosyası kontrolü: tesisin takip edilen yükümlülüklerinden belge listesi.
import type { DosyaDurumu, TesisYukumlulukSatiri, YukumlulukTuruSatiri } from '@/lib/veri/tipler';

export const DOSYA_DURUMU: Record<DosyaDurumu, { ad: string; sinif: string }> = {
  tam: { ad: 'Dosyada, tam', sinif: 'bg-yesil-acik text-yesil-koyu' },
  eksik: { ad: 'Eksik', sinif: 'bg-kirmizi-zemin text-kirmizi' },
  imzasiz: { ad: 'İmzasız', sinif: 'bg-turuncu-zemin text-turuncu' },
};

export type DosyaKalemi = { id: string; ad: string };

/** Aktif kayıtlar, tür sırasına göre; etiketli kayıtlar etiketiyle. */
export function dosyaKalemleri(kayitlar: TesisYukumlulukSatiri[], turler: YukumlulukTuruSatiri[]): DosyaKalemi[] {
  const tur = new Map(turler.map((t) => [t.id, t]));
  return kayitlar
    .filter((k) => k.durum === 'aktif' && tur.has(k.tur_id))
    .sort((a, b) => tur.get(a.tur_id)!.sira - tur.get(b.tur_id)!.sira || a.etiket.localeCompare(b.etiket))
    .map((k) => ({ id: k.id, ad: `${tur.get(k.tur_id)!.ad}${k.etiket ? ` · ${k.etiket}` : ''}` }));
}
