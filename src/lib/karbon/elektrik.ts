// Şebeke elektriği emisyon faktörleri (t CO₂e / MWh). Kaynak: ETKB 2022 üretim ve tüketim noktası faktörleri.
// Yeni yıl yayımlandığında buraya yeni sürüm eklenir; envanter kendi yılına en yakın yayımlanmış yılı kullanır.
import type { KaynakKodu } from './kaynaklar';

export type Baglanti = 'dagitim' | 'iletim';

export type ElektrikFaktoru = {
  yil: number;
  kaynak: KaynakKodu;
  uretim: number;
  tuketim: Record<Baglanti, number>;
  /** Faktörün kendisi için kabul edilen belirsizlik (oran). Kaynak belirsizlik vermez; bkz. metodoloji. */
  belirsizlik: number;
};

export const ELEKTRIK: ElektrikFaktoru[] = [
  { yil: 2022, kaynak: 'ETKB_2022', uretim: 0.442, tuketim: { iletim: 0.445, dagitim: 0.478 }, belirsizlik: 0.05 },
];

/** Envanter yılına eşit ya da ondan önceki en yeni faktör; hiçbiri yoksa en eskisi. */
export function elektrikFaktoru(yil: number): ElektrikFaktoru {
  const sirali = [...ELEKTRIK].sort((a, b) => b.yil - a.yil);
  return sirali.find((f) => f.yil <= yil) ?? sirali[sirali.length - 1];
}
