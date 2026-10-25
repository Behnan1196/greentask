import { trTarih } from '@/lib/termin/tarih';
import type { Gorev } from '@/lib/veri/tipler';
import type { TerminSatiri } from '@/lib/veri/terminler';
import type { TakvimOlayi } from './ics';

const TAKVIME_GIRER = new Set(['gecikti', 'acil', 'yaklasiyor', 'planli']);

/** Terminleri ve görevleri takvim olaylarına çevirir: aksiyon günü ve (farklıysa) son gün. */
export function takvimOlaylari(terminler: TerminSatiri[], gorevler: Gorev[], kokUrl: string): TakvimOlayi[] {
  const olaylar: TakvimOlayi[] = [];
  for (const s of terminler) {
    if (!TAKVIME_GIRER.has(s.sonuc.durum) || !s.sonuc.aksiyonTarihi) continue;
    const kim = s.tesis ? `${s.tesis.gt_kod} ${s.tesis.kisa_ad}` : s.kayit.etiket;
    const tur = s.kayit.etiket && s.tesis ? `${s.tur.ad} (${s.kayit.etiket})` : s.tur.ad;
    const url = s.tesis ? `${kokUrl}/tesisler/${s.tesis.gt_kod}` : `${kokUrl}/`;
    const aciklama = [
      `${tur}`,
      s.sonuc.sonTarih ? `Son tarih: ${trTarih(s.sonuc.sonTarih)}` : null,
      s.sonuc.aciklama || null,
      s.kayit.notlar || null,
      url,
    ]
      .filter(Boolean)
      .join('\n');
    olaylar.push({
      uid: `${s.kayit.id}-aksiyon-${s.sonuc.aksiyonTarihi}@greentask`,
      tarih: s.sonuc.aksiyonTarihi,
      baslik: `${kim} · ${s.tur.ad}: ${s.sonuc.aksiyonAdi ?? 'aksiyon'}`,
      aciklama,
      url,
    });
    if (s.sonuc.sonTarih && s.sonuc.sonTarih !== s.sonuc.aksiyonTarihi) {
      olaylar.push({
        uid: `${s.kayit.id}-son-${s.sonuc.sonTarih}@greentask`,
        tarih: s.sonuc.sonTarih,
        baslik: `${kim} · ${s.tur.ad}: SON GÜN`,
        aciklama,
        url,
      });
    }
  }
  for (const g of gorevler) {
    if (!g.son_tarih || g.durum === 'tamamlandi' || g.durum === 'iptal') continue;
    olaylar.push({
      uid: `gorev-${g.id}@greentask`,
      tarih: g.son_tarih,
      baslik: `Görev: ${g.baslik}`,
      aciklama: [g.aciklama, `${kokUrl}/islerim`].filter(Boolean).join('\n'),
      url: `${kokUrl}/islerim`,
    });
  }
  return olaylar;
}
