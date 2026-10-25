import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mevzuatiBul } from '@/lib/mevzuat/etki';
import { trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { mevzuatGuncelle } from '../eylemler';
import { ANA, GIRDI, MevzuatAlanlari, grupSirasi } from '../formlar';

export const metadata: Metadata = { title: 'Mevzuat' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MevzuatKaydi(props: PageProps<'/mevzuat/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const [m, mevzuatlar, matris, gruplar, tesisler, degisiklikler] = await Promise.all([
    depo.mevzuat(id),
    depo.mevzuatlar(),
    depo.mevzuatMatrisi(id),
    depo.sektorGruplari(),
    depo.tesisler(),
    depo.mevzuatDegisiklikleri(),
  ]);
  if (!m) notFound();
  gruplar.sort((a, b) => grupSirasi(a.kod, b.kod));
  const hucre = new Map(matris.map((h) => [h.grup_kod, h.uygulama]));
  const kategoriler = [...new Set(mevzuatlar.map((x) => x.kategori).filter((k): k is string => !!k))].sort((a, b) => a.localeCompare(b, 'tr'));
  const ilgili = degisiklikler.filter((d) => mevzuatiBul(d, mevzuatlar)?.id === id);
  const uygulanan = tesisler
    .filter((t) => t.grup_kod && hucre.has(t.grup_kod))
    .sort((a, b) => a.gt_kod.localeCompare(b.gt_kod));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/mevzuat?sekme=kutuphane" className="text-sm no-underline">
        ← Mevzuat kütüphanesi
      </Link>
      <header className="flex flex-col gap-1.5">
        <span className="text-sm text-soluk">{[m.kategori ?? 'Kategorisiz', m.tur, m.rg_metin && `RG ${m.rg_metin}`].filter(Boolean).join(' · ')}</span>
        <h1 className="text-3xl font-semibold tracking-tight">{m.ad}</h1>
        {m.kapsam_notu && <p className="max-w-3xl text-sm text-murekkep-2">{m.kapsam_notu}</p>}
        {m.teyit_gerekli && <span className="self-start rounded-md bg-turuncu-zemin px-2 py-0.5 text-xs font-semibold text-turuncu">Güncel hâli RG’den teyit edilmeli</span>}
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <form action={mevzuatGuncelle} className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <input type="hidden" name="id" value={id} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-semibold">Hangi sektör gruplarına uygulanır</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
              {gruplar.map((g) => (
                <label key={g.kod} className="flex items-center justify-between gap-2 rounded-lg bg-[#f7f8f5] px-3 py-2 text-sm" title={g.aciklama ?? undefined}>
                  <span className="min-w-0">
                    <span className="font-mono text-xs">{g.kod}</span> {g.ad}
                  </span>
                  <select name={`matris_${g.kod}`} defaultValue={hucre.get(g.kod) ?? ''} className={`${GIRDI} min-h-9 shrink-0`}>
                    <option value="">—</option>
                    <option value="X">X doğrudan</option>
                    <option value="K">K koşullu</option>
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 border-t border-cizgi pt-4">
            <MevzuatAlanlari m={m} kategoriler={kategoriler} />
          </div>
          <button className={`${ANA} self-start`}>Kaydet</button>
        </form>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Uygulanan tesisler · {uygulanan.length}</h2>
            {uygulanan.map((t) => (
              <Link key={t.id} href={`/tesisler/${t.gt_kod}`} className="flex justify-between gap-2 text-sm no-underline">
                <span>
                  <span className="font-mono text-xs text-soluk">{t.gt_kod}</span> {t.kisa_ad}
                </span>
                <span className="text-xs text-soluk">{hucre.get(t.grup_kod!) === 'X' ? 'doğrudan' : 'koşullu'}</span>
              </Link>
            ))}
            {!uygulanan.length && <p className="text-sm text-soluk">Hiçbir gruba işaretlenmemiş.</p>}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Değişiklik kayıtları</h2>
            {ilgili.map((d) => (
              <Link key={d.id} href={`/mevzuat?acik=${d.id}#d-${d.id}`} className="flex flex-col text-sm no-underline">
                <span>{d.ad}</span>
                <span className="text-xs text-soluk">
                  tespit {trTarih(d.tespit_tarihi)} · {d.durum === 'acik' ? 'açık' : 'kapandı'}
                </span>
              </Link>
            ))}
            {!ilgili.length && <p className="text-sm text-soluk">Kayıtlı değişiklik yok.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
