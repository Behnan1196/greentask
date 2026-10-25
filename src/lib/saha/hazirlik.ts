// Saha ziyareti hazırlık listesi: tesisin güncel durumundan "bu ziyarette nelere bakılmalı, ne istenmeli" çıkarır.
import { trTarih } from '@/lib/termin/tarih';
import type { Gorev } from '@/lib/veri/tipler';
import type { TerminSatiri } from '@/lib/veri/terminler';

export type HazirlikMaddesi = { metin: string; kritik?: boolean };
export type HazirlikBolumu = { baslik: string; maddeler: HazirlikMaddesi[] };
export type AcikBulgu = { bulgu: string; termin: string | null; ziyaretTarihi: string };

/** Yükümlülük türüne göre sahada istenecek / bakılacak şey. */
const ISTENECEK: Record<string, string> = {
  gfb_izin: 'İzin/lisans dosyasındaki eksik belgeleri tamamlat',
  mss: 'Yenilenmiş poliçenin aslını gör, kopyasını al',
  sifir_atik: 'Sıfır atık belgesi başvuru evrakını ve kutu/alan görsellerini al',
  kapasite: 'Güncel makine-ekipman listesini ve üretim verilerini iste',
  eayp: 'EAYP için atık miktarları ve proses değişikliklerini sor',
  bkkr: 'Ruhsat yenileme belgelerini ve son analiz sonuçlarını iste',
  emisyon: 'Baca sayısını teyit et, ölçüm firmasının takvimini sor',
  atiksu_numune: 'Numune noktasını kontrol et, son analiz raporunu al',
  depo_gazi: 'Aylık depo gazı ölçüm kayıtlarını al',
  sizinti_suyu: 'Sızıntı suyu analiz raporlarını ve numune noktasını kontrol et',
  gozlem_kuyusu: 'Gözlem kuyusu ölçüm kayıtlarını al, kapakları kontrol et',
  ic_tetkik: 'İç tetkiki bu ziyarette yap ya da tarihini kesinleştir',
  egitim: 'Eğitim tarihini kesinleştir, katılım listesini hazırlat',
  bitkisel_atik_yag: 'Güncel sözleşmeyi ve teslim belgelerini iste',
  tibbi_atik: 'Güncel sözleşmeyi ve teslim belgelerini iste',
  ced_izleme: 'Dönem izleme verilerini topla',
  atik_beyani: 'Biten yılın atık çıkış verilerini ve lisanslı firma faturalarını al',
};

const ONCELIKLI = new Set(['gecikti', 'acil', 'yaklasiyor']);

function kalanMetni(k: number | null): string {
  if (k == null) return '';
  if (k < 0) return `${-k} gün geçti`;
  if (k === 0) return 'bugün';
  return `${k} gün kaldı`;
}

export function hazirlikListesi(girdi: {
  terminler: TerminSatiri[];
  gorevler: Gorev[];
  acikBulgular: AcikBulgu[];
}): HazirlikBolumu[] {
  const { terminler, gorevler, acikBulgular } = girdi;
  const bolumler: HazirlikBolumu[] = [];

  const oncelikli = terminler.filter((s) => ONCELIKLI.has(s.sonuc.durum));
  if (oncelikli.length) {
    bolumler.push({
      baslik: 'Gecikmiş ve yaklaşan yükümlülükler',
      maddeler: oncelikli.map((s) => ({
        metin: `${s.tur.ad}${s.kayit.etiket ? ` (${s.kayit.etiket})` : ''} — ${s.sonuc.aksiyonAdi ?? 'aksiyon'} ${trTarih(
          s.sonuc.aksiyonTarihi,
        )}, ${kalanMetni(s.sonuc.kalanGunAksiyon)}. ${ISTENECEK[s.tur.kod] ?? 'Durumu sor'}.`,
        kritik: s.sonuc.durum === 'gecikti' && (s.tur.cezai_risk === 'var' || s.tur.cezai_risk === 'yuksek'),
      })),
    });
  }

  const eksik = terminler.filter((s) => s.sonuc.durum === 'veri_eksik');
  if (eksik.length) {
    bolumler.push({
      baslik: 'Sistemde eksik bilgi — sahada sor',
      maddeler: eksik.map((s) => ({ metin: `${s.tur.ad}: ${s.sonuc.aciklama.toLocaleLowerCase('tr')}. ${ISTENECEK[s.tur.kod] ?? ''}`.trim() })),
    });
  }

  if (acikBulgular.length) {
    bolumler.push({
      baslik: 'Önceki ziyaretlerden açık bulgular',
      maddeler: acikBulgular.map((b) => ({
        metin: `${b.bulgu} (${trTarih(b.ziyaretTarihi)} ziyareti${b.termin ? `, termin ${trTarih(b.termin)}` : ''}) — giderildi mi kontrol et, fotoğrafla.`,
        kritik: true,
      })),
    });
  }

  const acikGorev = gorevler.filter((g) => g.durum === 'acik' || g.durum === 'devam');
  if (acikGorev.length) {
    bolumler.push({
      baslik: 'Bu tesisle ilgili açık görevler',
      maddeler: acikGorev.map((g) => ({ metin: `${g.baslik}${g.son_tarih ? ` (son tarih ${trTarih(g.son_tarih)})` : ''}` })),
    });
  }

  const kodlar = new Set(terminler.filter((s) => s.kayit.durum === 'aktif').map((s) => s.tur.kod));
  const her: HazirlikMaddesi[] = [
    { metin: 'Tehlikeli atık geçici depolama alanı: etiket, giriş tarihi, 180 gün sınırı — fotoğrafla' },
    { metin: 'Atık çıkış belgeleri ve lisanslı firma faturaları güncel mi' },
    { metin: 'Tesis dosyasında imzasız veya eksik evrak var mı' },
    { metin: 'Teslim alınan belgeleri listele (dönüşte sisteme işlenecek)' },
  ];
  if (kodlar.has('depo_gazi') || kodlar.has('sizinti_suyu')) {
    her.push({ metin: 'Sızıntı suyu toplama noktası ve depo gazı ölçüm noktaları — fotoğrafla' });
  }
  if (kodlar.has('gozlem_kuyusu')) her.push({ metin: 'Gözlem kuyuları (menba / mansap) erişim ve kapak durumu' });
  if (kodlar.has('atiksu_numune') || kodlar.has('bkkr')) her.push({ metin: 'Atıksu çıkış / numune noktası — fotoğrafla' });
  bolumler.push({ baslik: 'Her ziyarette', maddeler: her });

  return bolumler;
}
