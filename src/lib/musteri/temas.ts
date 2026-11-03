// Müşteri ilişkisi: son temas tarihi ve yaklaşan doğum günleri.
import { gunEkle, gunFarki } from '@/lib/termin/tarih';
import type { Gorusme, Kisi, SahaZiyareti, Tesis } from '@/lib/veri/tipler';

/** Varsayılan: 60 günden uzun süredir temas yoksa hatırlat. */
export const TEMAS_ESIGI = 60;

/** Her tesis için son temas (görüşme ya da yapılmış saha ziyareti); hiç yoksa null. */
export function sonTemaslar(tesisler: Tesis[], gorusmeler: Gorusme[], ziyaretler: SahaZiyareti[]): Map<string, string | null> {
  const son = new Map<string, string | null>(tesisler.map((t) => [t.id, null]));
  const isle = (tesisId: string, tarih: string) => {
    if (!son.has(tesisId)) return;
    const m = son.get(tesisId);
    if (!m || tarih > m) son.set(tesisId, tarih);
  };
  for (const g of gorusmeler) isle(g.tesis_id, g.tarih);
  for (const z of ziyaretler) if (z.durum === 'yapildi' || z.durum === 'raporlandi') isle(z.tesis_id, z.tarih);
  return son;
}

/** Doğum günü önümüzdeki `gun` gün içinde olan kişiler (yalnızca gün ve ay), yakından uzağa. */
export function yaklasanDogumGunleri(kisiler: Kisi[], bugun: string, gun = 14): { kisi: Kisi; tarih: string; kalan: number }[] {
  const yil = Number(bugun.slice(0, 4));
  const son = gunEkle(bugun, gun);
  const sonuc: { kisi: Kisi; tarih: string; kalan: number }[] = [];
  for (const k of kisiler) {
    if (!k.dogum_gunu) continue;
    const ayGun = k.dogum_gunu.slice(5);
    for (const y of [yil, yil + 1]) {
      // 29 Şubat artık olmayan yılda 28 Şubat'ta kutlanır
      const tarih = ayGun === '02-29' && new Date(y, 1, 29).getMonth() !== 1 ? `${y}-02-28` : `${y}-${ayGun}`;
      if (tarih >= bugun && tarih <= son) {
        sonuc.push({ kisi: k, tarih, kalan: gunFarki(bugun, tarih) });
        break;
      }
    }
  }
  return sonuc.sort((a, b) => a.kalan - b.kalan);
}
