import type { Metadata } from 'next';
import Link from 'next/link';
import { KalanGun } from '@/components/rozetler';
import { bugun } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { terminleriHesapla } from '@/lib/veri/terminler';

export const metadata: Metadata = { title: 'Tesisler' };

export default async function Tesisler(props: PageProps<'/tesisler'>) {
  const { depo } = await oturumuDogrula();
  const sp = await props.searchParams;
  const ara = typeof sp.ara === 'string' ? sp.ara.trim() : '';

  const [tesisler, turler, kayitlar, olaylar] = await Promise.all([
    depo.tesisler(),
    depo.turler(),
    depo.yukumlulukler(),
    depo.olaylar(),
  ]);
  const terminler = terminleriHesapla(kayitlar, turler, tesisler, olaylar, bugun());

  const arama = ara.toLocaleLowerCase('tr');
  const liste = tesisler
    .filter(
      (t) =>
        !arama ||
        [t.gt_kod, t.kisa_ad, t.resmi_unvan, t.il, t.firma_grubu, ...t.nace_kodlari?.split(/[ /,-]+/) ?? []]
          .filter(Boolean)
          .some((v) => v!.toLocaleLowerCase('tr').includes(arama)),
    )
    .map((t) => {
      const benim = terminler.filter((s) => s.tesis?.id === t.id);
      return {
        t,
        gecikmis: benim.filter((s) => s.sonuc.durum === 'gecikti').length,
        eksik: benim.filter((s) => s.sonuc.durum === 'veri_eksik').length,
        ilk: benim.find((s) => s.sonuc.kalanGunAksiyon != null && s.sonuc.durum !== 'surecte'),
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Tesisler</h1>
          <span className="text-sm text-murekkep-2">{tesisler.length} aktif tesis</span>
        </div>
        <form className="flex gap-2" action="/tesisler">
          <label htmlFor="ara" className="sr-only">
            Tesis ara
          </label>
          <input
            id="ara"
            name="ara"
            defaultValue={ara}
            placeholder="Ad, GT kodu, il, NACE…"
            className="min-h-11 w-64 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm"
          />
          <button className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-4 text-sm">Ara</button>
        </form>
      </header>
      <section className="overflow-x-auto rounded-xl border border-cizgi bg-yuzey">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-soluk">
              <th className="px-5 py-3 font-medium">Tesis</th>
              <th className="px-3 py-3 font-medium">İl</th>
              <th className="px-3 py-3 font-medium">Sınıf · Grup</th>
              <th className="px-3 py-3 font-medium">Gecikmiş</th>
              <th className="px-3 py-3 font-medium">Veri eksik</th>
              <th className="px-5 py-3 font-medium">En yakın aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {liste.map(({ t, gecikmis, eksik, ilk }) => (
              <tr key={t.id} className="border-t border-cizgi-ince">
                <td className="px-5 py-3">
                  <Link href={`/tesisler/${t.gt_kod}`} className="font-medium no-underline">
                    <span className="font-mono text-xs text-soluk">{t.gt_kod}</span> {t.kisa_ad}
                  </Link>
                  {t.firma_grubu && <span className="block text-xs text-soluk">{t.firma_grubu}</span>}
                </td>
                <td className="px-3 py-3 text-murekkep-2">{t.il ?? '—'}</td>
                <td className="px-3 py-3 text-murekkep-2">
                  {t.sinif ?? '—'} · {t.grup_kod ?? '—'}
                </td>
                <td className={`px-3 py-3 font-mono ${gecikmis ? 'font-semibold text-kirmizi' : 'text-soluk'}`}>{gecikmis}</td>
                <td className="px-3 py-3 font-mono text-soluk">{eksik}</td>
                <td className="px-5 py-3">
                  {ilk ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <KalanGun sonuc={ilk.sonuc} />
                      <span className="text-murekkep-2">{ilk.tur.ad}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
