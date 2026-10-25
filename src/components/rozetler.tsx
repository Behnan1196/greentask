import type { TerminDurumu, TerminSonucu } from '@/lib/termin/motor';
import type { CezaiRisk } from '@/lib/veri/tipler';

const DURUM: Record<TerminDurumu, { ad: string; sinif: string }> = {
  gecikti: { ad: 'Gecikti', sinif: 'bg-kirmizi-zemin text-kirmizi' },
  acil: { ad: '30 gün içinde', sinif: 'bg-turuncu-zemin text-turuncu' },
  yaklasiyor: { ad: '90 gün içinde', sinif: 'bg-gri-zemin text-gri' },
  planli: { ad: 'Planlı', sinif: 'bg-yesil-acik text-yesil-koyu' },
  surecte: { ad: 'Süreçte', sinif: 'bg-mavi-zemin text-mavi' },
  veri_eksik: { ad: 'Veri eksik', sinif: 'border border-dashed border-[#a9afa6] bg-white text-soluk' },
  muaf: { ad: 'Muaf', sinif: 'bg-gri-zemin text-soluk' },
  kapsam_disi: { ad: 'Kapsam dışı', sinif: 'bg-gri-zemin text-soluk' },
  beklemede: { ad: 'Beklemede', sinif: 'bg-gri-zemin text-soluk' },
};

const ROZET = 'inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold';

export function DurumRozeti({ durum }: { durum: TerminDurumu }) {
  const d = DURUM[durum];
  return <span className={`${ROZET} ${d.sinif}`}>{d.ad}</span>;
}

/** "12 gün geçti" / "24 gün" — rengi duruma göre. */
export function KalanGun({ sonuc }: { sonuc: TerminSonucu }) {
  const k = sonuc.kalanGunAksiyon;
  if (k == null) return <DurumRozeti durum={sonuc.durum} />;
  const sinif = sonuc.durum === 'surecte' ? DURUM.surecte.sinif : k < 0 ? DURUM.gecikti.sinif : k <= 30 ? DURUM.acil.sinif : 'bg-gri-zemin text-gri';
  return (
    <span className={`${ROZET} font-mono font-medium ${sinif}`}>
      {sonuc.durum === 'surecte' ? 'Süreçte' : k < 0 ? `${-k} gün geçti` : k === 0 ? 'Bugün' : `${k} gün`}
    </span>
  );
}

const RISK: Record<CezaiRisk, { ad: string; sinif: string }> = {
  yuksek: { ad: 'Yüksek', sinif: 'text-kirmizi font-semibold' },
  var: { ad: 'Var', sinif: 'text-kirmizi font-medium' },
  dusuk: { ad: 'Düşük', sinif: 'text-soluk' },
  yok: { ad: 'Yok', sinif: 'text-soluk' },
};

export function RiskEtiketi({ risk }: { risk: CezaiRisk }) {
  return <span className={`text-sm ${RISK[risk].sinif}`}>{RISK[risk].ad}</span>;
}
