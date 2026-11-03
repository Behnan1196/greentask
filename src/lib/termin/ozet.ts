// Kural parametrelerinin insan diliyle özeti (Kılavuz ekranı ve yeni personel için).
import type { Asama, KuralTipi, Parametreler } from './motor';

export const KURAL_TIPI_ADI: Record<KuralTipi, string> = {
  bitis_tarihi: 'Geçerlilik bitişine göre (belge yenileme)',
  son_islem_periyot: 'Son işlemden itibaren periyot (ölçüm, numune)',
  sozlesme_takvimi: 'Sözleşme yıldönümüne göre (iç tetkik, eğitim)',
  yenilenen_sozlesme: 'Kendiliğinden yenilenen sözleşme',
  donemsel_rapor: 'Dönemsel rapor (izleme başlangıcından)',
  yillik_sabit_tarih: 'Her yıl aynı tarihte (beyan, bildirim)',
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const sure = (ay?: number, gun?: number) => (ay ? `${ay} ay` : gun ? `${gun} gün` : null);
const asama = (a: Asama) => `${a.ad}: ${sure(a.ay, a.gun) ?? 'son gün'} önce`;

export function kuralOzeti(tip: KuralTipi, p: Parametreler): string {
  const parca: unknown[] = [];
  switch (tip) {
    case 'bitis_tarihi':
      parca.push(p.gecerlilik_ay && `Belge ${p.gecerlilik_ay} ay geçerli`);
      parca.push(p.asamalar?.length ? p.asamalar.map(asama).join(' · ') : 'Bitişte yenileme');
      break;
    case 'son_islem_periyot':
      parca.push(p.atiksu_niteligi ? 'Periyot SKKY tablosundan (tesisin debisine göre)' : `Her ${sure(p.periyot_ay, p.periyot_gun) ?? '?'}`);
      parca.push(sure(p.hazirlik_ay, p.hazirlik_gun) && `${sure(p.hazirlik_ay, p.hazirlik_gun)} önce ${(p.aksiyon_adi ?? 'hazırlık').toLocaleLowerCase('tr')}`);
      break;
    case 'sozlesme_takvimi':
      parca.push(`İlk ${p.aksiyon_adi ?? 'gerçekleşme'} sözleşmeden ${p.ilk_gun ?? 0} gün sonra, sonra her yıl`);
      break;
    case 'yenilenen_sozlesme':
      parca.push(`${p.sure_yil ?? 1} yıllık`);
      parca.push(p.yenileme ? `${p.yenileme_yil ?? 1} yılda bir kendiliğinden yenilenir` : 'yenilenmez');
      parca.push(p.hazirlik_gun && `${p.hazirlik_gun} gün önce uyarı`);
      break;
    case 'donemsel_rapor':
      parca.push(`${p.periyot_ay ?? '?'} aylık dönemler, dönem sonundan ${p.sunum_gun ?? 0} gün içinde sunum`);
      break;
    case 'yillik_sabit_tarih':
      parca.push(p.ay && p.gun_no ? `Her yıl ${p.gun_no} ${AYLAR[p.ay - 1]}` : 'Tarih tanımlı değil');
      parca.push(p.hazirlik_gun && `${p.hazirlik_gun} gün önce uyarı`);
      parca.push(p.onay_gerekli && 'onay gelmeden dönem kapanmaz');
      break;
  }
  if (p.imzali_nusha) parca.push('imzalı nüsha takip edilir');
  return parca.filter((x): x is string => typeof x === 'string' && x !== '').join(' · ');
}
