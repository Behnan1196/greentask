import type { Metadata } from 'next';
import Link from 'next/link';
import { PLAN_DURUMU } from '@/lib/plan/durum';
import { trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { planOlustur } from './eylemler';
import { PlanAlanlari } from './plan-alanlari';

export const metadata: Metadata = { title: 'İşletme Planları' };

const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';

export default async function PlanlarSayfasi() {
  const { depo } = await oturumuDogrula();
  const [planlar, tesisler, ekip, gorevler] = await Promise.all([depo.planlar(), depo.tesisler(), depo.kullanicilar(), depo.gorevler({ acik: true })]);
  const surumler = await Promise.all(planlar.map((p) => depo.planSurumleri(p.id)));
  const sonBulgular = await Promise.all(surumler.map((s) => (s[0] ? depo.planBulgulari(s[0].id) : Promise.resolve([]))));
  const tesis = new Map(tesisler.map((t) => [t.id, t]));
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">İşletme Planları</h1>
        <p className="max-w-3xl text-sm text-murekkep-2">
          Word’de tutulan planın her sürümü buraya yüklenir. Sistem bölüm, tablo ve şekilleri çıkarır, dizin ve numaralandırma
          hatalarını, mükerrer başlıkları ve tutmayan hesapları tarar. Revizyon maddeleri görev olarak takip edilir.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <h2 className="px-5 py-3.5 text-base font-semibold">Planlar · {planlar.length}</h2>
        <ul>
          {planlar.map((p, i) => {
            const son = surumler[i][0];
            const acikBulgu = sonBulgular[i].filter((b) => b.durum === 'acik' && b.onem !== 'dusuk').length;
            const acikGorev = gorevler.filter((g) => g.isletme_plani_id === p.id).length;
            return (
              <li key={p.id} className="border-t border-cizgi-ince">
                <Link href={`/planlar/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 no-underline hover:bg-[#fafbf9]">
                  <span className="min-w-0 flex-[1_1_320px]">
                    <span className="block text-sm font-medium text-murekkep">{p.baslik}</span>
                    <span className="text-xs text-soluk">
                      {[
                        p.tesis_idleri.map((t) => tesis.get(t)?.gt_kod).filter(Boolean).join(', ') || 'Tesis seçilmemiş',
                        p.onayli_surum && `onaylı: ${p.onayli_surum}`,
                        son ? `son sürüm ${trTarih(new Date(son.created_at).toISOString().slice(0, 10))}` : 'Word yüklenmedi',
                        adi.get(p.hazirlayan_id ?? ''),
                        p.sunum_tarihi && `sunum ${trTarih(p.sunum_tarihi)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    {acikBulgu > 0 && <span className="rounded-md bg-kirmizi-zemin px-2 py-0.5 font-semibold text-kirmizi">{acikBulgu} bulgu</span>}
                    {acikGorev > 0 && <span className="rounded-md bg-turuncu-zemin px-2 py-0.5 font-semibold text-turuncu">{acikGorev} açık madde</span>}
                    <span className={`rounded-md px-2 py-0.5 font-semibold ${PLAN_DURUMU[p.durum].sinif}`}>{PLAN_DURUMU[p.durum].ad}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!planlar.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Henüz plan yok. Aşağıdan ilk planı ekleyin.</p>}
      </section>

      <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4" open={!planlar.length}>
        <summary className="cursor-pointer text-base font-semibold">Yeni plan</summary>
        <form action={planOlustur} className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <PlanAlanlari tesisler={tesisler} ekip={ekip} />
          <button className={`${ANA} justify-self-start`}>Planı oluştur</button>
        </form>
      </details>
    </div>
  );
}
