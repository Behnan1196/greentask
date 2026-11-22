// Kategori adları (istemci bileşenleri motoru ve faktör kütüphanesini yüklemeden kullanabilsin diye ayrı).

export type IsoKategori = '1' | '2' | '3' | '4' | '5' | '6';

export const ISO_KATEGORI_ADI: Record<IsoKategori, string> = {
  '1': 'Kategori 1 · Doğrudan emisyonlar',
  '2': 'Kategori 2 · Satın alınan enerjiden dolaylı emisyonlar',
  '3': 'Kategori 3 · Taşımacılıktan dolaylı emisyonlar',
  '4': 'Kategori 4 · Kullanılan ürünlerden dolaylı emisyonlar',
  '5': 'Kategori 5 · Ürünlerin kullanımından dolaylı emisyonlar',
  '6': 'Kategori 6 · Diğer dolaylı emisyonlar',
};

/** GHG Protocol Kapsam 3 kategorileri (1–15). */
export const GHGP_KATEGORI_ADI: Record<number, string> = {
  1: 'Satın alınan mal ve hizmetler',
  2: 'Sermaye malları',
  3: 'Yakıt ve enerjiyle ilgili faaliyetler',
  4: 'Yukarı akış taşımacılık ve dağıtım',
  5: 'Faaliyetlerde oluşan atık',
  6: 'İş seyahatleri',
  7: 'Çalışanların işe gidiş-gelişi',
  8: 'Yukarı akış kiralanan varlıklar',
  9: 'Aşağı akış taşımacılık ve dağıtım',
  10: 'Satılan ürünlerin işlenmesi',
  11: 'Satılan ürünlerin kullanımı',
  12: 'Satılan ürünlerin ömür sonu',
  13: 'Aşağı akış kiralanan varlıklar',
  14: 'Franchise',
  15: 'Yatırımlar',
};

