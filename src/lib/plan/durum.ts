import type { OgeDurumu, PlanBulgusu, PlanDurumu, PlanOgesiSatiri } from '@/lib/veri/tipler';

export const PLAN_DURUMU: Record<PlanDurumu, { ad: string; sinif: string }> = {
  taslak: { ad: 'Taslak', sinif: 'bg-gri-zemin text-gri' },
  revizyonda: { ad: 'Revizyonda', sinif: 'bg-turuncu-zemin text-turuncu' },
  sunuldu: { ad: 'Bakanlığa sunuldu', sinif: 'bg-mavi-zemin text-mavi' },
  onaylandi: { ad: 'Onaylandı', sinif: 'bg-yesil-acik text-yesil-koyu' },
};

export const OGE_DURUMU: Record<OgeDurumu, { ad: string; sinif: string }> = {
  degismedi: { ad: 'Değişmeyecek', sinif: 'bg-gri-zemin text-gri' },
  kontrol: { ad: 'Kontrol edilecek', sinif: 'bg-mavi-zemin text-mavi' },
  guncellenecek: { ad: 'Güncellenecek', sinif: 'bg-turuncu-zemin text-turuncu' },
  eklenecek: { ad: 'Eklenecek', sinif: 'bg-kirmizi-zemin text-kirmizi' },
  tamam: { ad: 'Tamamlandı', sinif: 'bg-yesil-acik text-yesil-koyu' },
};

export const ICERIK_TURU: Record<PlanOgesiSatiri['icerik_turu'], string> = {
  metin: 'Metin',
  veri_tablosu: 'Veri tablosu',
  dis_belge: 'Görsel / dış belge',
  mevzuat_eki: 'Mevzuat eki',
};

/** İzleme verisinden üretilebilecek tablolar (ileride sistem bu tabloları doğrudan yazacak). */
export const VERI_KAYNAGI: Record<string, string> = {
  depo_gazi: 'Depo gazı ölçümleri',
  sizinti_suyu: 'Sızıntı suyu kayıtları',
  atiksu_numune: 'Atıksu numune sonuçları',
  gozlem_kuyusu: 'Gözlem kuyusu ölçümleri',
};

export const BULGU_KATEGORI: Record<string, string> = {
  dizin: 'Dizin',
  numara: 'Numaralandırma',
  icerik: 'İçerik',
  tutarlilik: 'Tutarlılık',
  yazim: 'Yazım',
  guncellik: 'Güncellik',
  hesap: 'Hesap',
};

export const BULGU_ONEMI: Record<PlanBulgusu['onem'], { ad: string; sinif: string }> = {
  yuksek: { ad: 'Yüksek', sinif: 'bg-kirmizi-zemin text-kirmizi' },
  orta: { ad: 'Orta', sinif: 'bg-turuncu-zemin text-turuncu' },
  dusuk: { ad: 'Bilgi', sinif: 'bg-gri-zemin text-gri' },
};

/** "Tablo 17 güncel verilerle yenilenecek" → Tablo 17 öğesi. "5.2 …" → 5.2 numaralı bölüm. */
export function satirdanOge(satir: string, ogeler: PlanOgesiSatiri[]): PlanOgesiSatiri | null {
  const m = /^\s*(?:(Tablo|Şekil)\s*(\d+)|(\d+(?:\.[\dA-ZÇĞİÖŞÜ]+)+|\d+)\b)/i.exec(satir);
  if (!m) return null;
  const numara = m[1] ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLocaleLowerCase('tr')} ${m[2]}` : m[3];
  return ogeler.find((o) => o.numara === numara) ?? null;
}
