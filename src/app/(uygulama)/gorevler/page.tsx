import type { Metadata } from 'next';
import Link from 'next/link';
import { GorevSatiri } from '@/components/gorev-satiri';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';

export const metadata: Metadata = { title: 'Görev panosu' };

export default async function GorevPanosu() {
  const { depo } = await oturumuDogrula();
  const gun = bugun();
  const [gorevler, ekip, tesisler, toplantilar] = await Promise.all([
    depo.gorevler({ acik: true }),
    depo.kullanicilar(),
    depo.tesisler(),
    depo.toplantilar(),
  ]);
  const tesisAdi = new Map(tesisler.map((t) => [t.id, `${t.gt_kod} ${t.kisa_ad}`]));
  const toplantiTarihi = new Map(toplantilar.map((t) => [t.id, t.tarih]));
  const sutunlar = [
    ...ekip.map((k) => ({ id: k.id as string | null, ad: k.ad_soyad })),
    { id: null, ad: 'Atanmamış' },
  ]
    .map((s) => ({ ...s, gorevler: gorevler.filter((g) => (g.sorumlu_id ?? null) === s.id) }))
    .filter((s) => s.id || s.gorevler.length);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Görev panosu</h1>
          <span className="text-sm text-murekkep-2">{gorevler.length} açık görev · kişi bazında</span>
        </div>
        <Link href="/toplantilar" className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-4 py-2.5 text-sm no-underline">
          ← Toplantılar
        </Link>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        {sutunlar.map((s) => {
          const geciken = s.gorevler.filter((g) => g.son_tarih && g.son_tarih < gun).length;
          return (
            <section key={s.id ?? 'yok'} className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">{s.ad}</h2>
                <span className="text-sm text-soluk">
                  {s.gorevler.length} açık{geciken ? <span className="font-semibold text-kirmizi"> · {geciken} gecikmiş</span> : null}
                </span>
              </div>
              <div className="divide-y divide-cizgi-ince">
                {s.gorevler.map((g) => (
                  <GorevSatiri
                    key={g.id}
                    g={g}
                    bugun={gun}
                    ek={[
                      g.toplanti_id ? `${trTarih(toplantiTarihi.get(g.toplanti_id) ?? null)} toplantısı` : 'Elle',
                      g.tesis_id ? tesisAdi.get(g.tesis_id) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
                {!s.gorevler.length && <p className="py-3 text-sm text-soluk">Açık görev yok.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
