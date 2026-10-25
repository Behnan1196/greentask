import type { Gorev, Toplanti } from './tipler';

/** Verilen toplantıdan önce yapılmış toplantılar (aynı gün açılmışsa daha önce açılan sayılır). */
export function oncekiToplantilar(toplantilar: Toplanti[], t: Toplanti): Set<string> {
  return new Set(
    toplantilar
      .filter((x) => x.id !== t.id && (x.tarih < t.tarih || (x.tarih === t.tarih && x.created_at < t.created_at)))
      .map((x) => x.id),
  );
}

/** Önceki toplantılarda verilmiş, hâlâ kapanmamış görevler. */
export function devredenGorevler(gorevler: Gorev[], toplantilar: Toplanti[], t: Toplanti): Gorev[] {
  const onceki = oncekiToplantilar(toplantilar, t);
  return gorevler.filter((g) => g.toplanti_id && onceki.has(g.toplanti_id) && (g.durum === 'acik' || g.durum === 'devam'));
}
