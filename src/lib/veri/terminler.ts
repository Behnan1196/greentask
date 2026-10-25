import { DURUM_ONCELIK, terminHesapla, type TerminSonucu } from '@/lib/termin/motor';
import type { OlaySatiri, Tesis, TesisYukumlulukSatiri, YukumlulukTuruSatiri } from './tipler';

export type TerminSatiri = {
  kayit: TesisYukumlulukSatiri;
  tur: YukumlulukTuruSatiri;
  tesis: Tesis | null;
  olaylar: OlaySatiri[];
  sonuc: TerminSonucu;
};

/** Ham kayıtları kural motorundan geçirip öncelik sırasına dizer. */
export function terminleriHesapla(
  kayitlar: TesisYukumlulukSatiri[],
  turler: YukumlulukTuruSatiri[],
  tesisler: Tesis[],
  olaylar: OlaySatiri[],
  bugun: string,
): TerminSatiri[] {
  const turHarita = new Map(turler.map((t) => [t.id, t]));
  const tesisHarita = new Map(tesisler.map((t) => [t.id, t]));
  const olayHarita = new Map<string, OlaySatiri[]>();
  for (const o of olaylar) {
    const l = olayHarita.get(o.tesis_yukumluluk_id) ?? [];
    l.push(o);
    olayHarita.set(o.tesis_yukumluluk_id, l);
  }
  const sonuc: TerminSatiri[] = [];
  for (const kayit of kayitlar) {
    const tur = turHarita.get(kayit.tur_id);
    if (!tur) continue;
    const tesis = kayit.tesis_id ? tesisHarita.get(kayit.tesis_id) ?? null : null;
    if (kayit.tesis_id && !tesis) continue; // pasif tesis
    const ol = olayHarita.get(kayit.id) ?? [];
    sonuc.push({
      kayit,
      tur,
      tesis,
      olaylar: ol,
      sonuc: terminHesapla(
        tur,
        { ...kayit, olaylar: ol.map((o) => ({ tarih: o.tarih, tur: o.tur, aciklama: o.aciklama })) },
        { sozlesme_tarihi: tesis?.sozlesme_tarihi },
        bugun,
      ),
    });
  }
  return sonuc.sort(
    (a, b) =>
      DURUM_ONCELIK[a.sonuc.durum] - DURUM_ONCELIK[b.sonuc.durum] ||
      (a.sonuc.kalanGunAksiyon ?? 99999) - (b.sonuc.kalanGunAksiyon ?? 99999) ||
      a.tur.sira - b.tur.sira,
  );
}

/** Etkin sorumlu: kayıtta seçilmişse o, yoksa tesisin sorumlusu. */
export const sorumlusu = (s: TerminSatiri) => s.kayit.sorumlu_id ?? s.tesis?.sorumlu_id ?? null;

export const riskli = (s: TerminSatiri) => s.tur.cezai_risk === 'var' || s.tur.cezai_risk === 'yuksek';
