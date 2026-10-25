import type { Metadata } from 'next';
import Link from 'next/link';
import { bugun, gunEkle, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { toplantiAc } from './eylemler';

export const metadata: Metadata = { title: 'Toplantılar' };

/** Bugün Pazartesi değilse bir sonraki Pazartesi. */
function siradakiPazartesi(g: string) {
  const gun = new Date(`${g}T00:00:00Z`).getUTCDay(); // 0 pazar … 1 pazartesi
  return gun === 1 ? g : gunEkle(g, (8 - gun) % 7 || 7);
}

export default async function Toplantilar() {
  const { depo } = await oturumuDogrula();
  const [toplantilar, gorevler] = await Promise.all([depo.toplantilar(), depo.gorevler({ toplantidan: true })]);
  const gun = bugun();
  const acik = toplantilar.find((t) => t.durum === 'acik');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Toplantılar</h1>
          <span className="text-sm text-murekkep-2">
            Haftalık büro toplantıları. Kapanmayan görevler bir sonraki toplantının gündemine kendiliğinden gelir.
          </span>
        </div>
        <Link href="/gorevler" className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-4 py-2.5 text-sm no-underline">
          Görev panosu →
        </Link>
      </header>

      {acik && (
        <Link
          href={`/toplantilar/${acik.id}`}
          className="flex items-center justify-between rounded-xl border border-yesil bg-yesil-acik px-5 py-4 no-underline"
        >
          <span>
            <span className="block text-sm text-yesil-koyu">Açık toplantı</span>
            <span className="text-lg font-semibold text-murekkep">
              {trTarih(acik.tarih)} · {acik.baslik}
            </span>
          </span>
          <span className="font-semibold">Gündemi aç →</span>
        </Link>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section className="min-w-0 flex-[999_1_520px] overflow-x-auto rounded-xl border border-cizgi bg-yuzey">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-soluk">
                <th className="px-5 py-3 font-medium">Tarih</th>
                <th className="px-3 py-3 font-medium">Toplantı</th>
                <th className="px-3 py-3 font-medium">Görevler</th>
                <th className="px-5 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {toplantilar.map((t) => {
                const g = gorevler.filter((x) => x.toplanti_id === t.id);
                const acikG = g.filter((x) => x.durum === 'acik' || x.durum === 'devam').length;
                return (
                  <tr key={t.id} className="border-t border-cizgi-ince">
                    <td className="px-5 py-3 font-mono text-xs">{trTarih(t.tarih)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/toplantilar/${t.id}`} className="font-medium no-underline">
                        {t.baslik}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-murekkep-2">
                      {g.length ? `${g.length} görev · ${acikG} açık` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          t.durum === 'acik' ? 'bg-yesil-acik text-yesil-koyu' : 'bg-gri-zemin text-gri'
                        }`}
                      >
                        {t.durum === 'acik' ? 'Açık' : 'Kapandı'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!toplantilar.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-soluk">
                    Henüz toplantı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="text-base font-semibold">Yeni toplantı</h2>
          <form action={toplantiAc} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Tarih
              <input
                type="date"
                name="tarih"
                required
                defaultValue={siradakiPazartesi(gun)}
                className="min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Başlık
              <input
                name="baslik"
                defaultValue="Haftalık büro toplantısı"
                className="min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm"
              />
            </label>
            <button className="min-h-10 self-start rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu">
              Toplantıyı aç
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
