import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { YazdirButonu } from '@/app/(uygulama)/saha/[id]/yukleyici';
import { ONEM } from '@/lib/saha/durum';
import { trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Saha ziyaret raporu' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Yazdırılabilir rapor: tarayıcının "PDF olarak kaydet" seçeneğiyle arşivlenir (20. klasör).
export default async function SahaRaporu(props: PageProps<'/saha-rapor/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const z = await depo.ziyaret(id);
  if (!z) notFound();
  const [tesisler, ekip, dosyalar, bulgular] = await Promise.all([
    depo.tesisler(),
    depo.kullanicilar(),
    depo.dosyalar(id),
    depo.bulgular([id]),
  ]);
  const tesis = tesisler.find((t) => t.id === z.tesis_id)!;
  const ziyaretci = ekip.find((k) => k.id === z.ziyaretci_id)?.ad_soyad ?? '—';
  const fotolar = dosyalar.filter((d) => d.tur === 'foto');
  const fotoNo = new Map(fotolar.map((d, i) => [d.id, i + 1]));

  return (
    <main className="mx-auto max-w-[900px] bg-white px-10 py-10 text-[13px] leading-relaxed text-murekkep print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm 14mm; } @media print { body { background: #fff; } }`}</style>
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <a href={`/saha/${id}?adim=rapor`} className="text-sm no-underline">
          ← Ziyarete dön
        </a>
        <YazdirButonu etiket="Yazdır / PDF olarak kaydet" />
      </div>

      <header className="flex items-start justify-between gap-6 border-b-2 border-murekkep pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-yesil-koyu">Greentask Enerji Danışmanlık</p>
          <h1 className="text-2xl font-semibold">Saha Ziyaret Raporu</h1>
        </div>
        <div className="text-right text-xs text-murekkep-2">
          <p>Rapor no: SZ-{z.tarih.replace(/-/g, '')}-{tesis.gt_kod}</p>
          <p>Durum: {z.durum === 'raporlandi' ? 'Tamamlandı' : 'Taslak'}</p>
        </div>
      </header>

      <table className="mt-4 w-full border-collapse text-[13px]">
        <tbody>
          {[
            ['Tesis', `${tesis.gt_kod} · ${tesis.resmi_unvan ?? tesis.kisa_ad}`],
            ['İl / NACE', `${tesis.il ?? '—'} · ${tesis.nace_kodlari ?? '—'}`],
            ['Ziyaret tarihi', trTarih(z.tarih)],
            ['Ziyaret eden', ziyaretci],
            ['Amaç', z.amac ?? '—'],
          ].map(([a, b]) => (
            <tr key={a} className="border-b border-cizgi">
              <th className="w-40 py-1.5 pr-4 text-left font-medium text-soluk">{a}</th>
              <td className="py-1.5">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {z.rapor_ozeti && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">Genel değerlendirme</h2>
          <p className="whitespace-pre-line">{z.rapor_ozeti}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-base font-semibold">Bulgular ve düzeltici faaliyetler</h2>
        {bulgular.length ? (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-murekkep text-left">
                <th className="py-1.5 pr-2">#</th>
                <th className="py-1.5 pr-2">Bulgu</th>
                <th className="py-1.5 pr-2">Dayanak</th>
                <th className="py-1.5 pr-2">Önem</th>
                <th className="py-1.5 pr-2">Düzeltici faaliyet</th>
                <th className="py-1.5">Termin</th>
              </tr>
            </thead>
            <tbody>
              {bulgular.map((b, i) => (
                <tr key={b.id} className="break-inside-avoid border-b border-cizgi align-top">
                  <td className="py-1.5 pr-2">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    {b.bulgu}
                    {b.dosya_id && fotoNo.has(b.dosya_id) && <span className="text-soluk"> (Foto {fotoNo.get(b.dosya_id)})</span>}
                  </td>
                  <td className="py-1.5 pr-2">{b.dayanak ?? '—'}</td>
                  <td className="py-1.5 pr-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ONEM[b.onem].sinif}`}>{ONEM[b.onem].ad}</span>
                  </td>
                  <td className="py-1.5 pr-2">{b.duzeltici_faaliyet ?? '—'}</td>
                  <td className="py-1.5 font-mono">{b.termin ? trTarih(b.termin) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-soluk">Bulgu kaydedilmedi.</p>
        )}
      </section>

      {fotolar.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold">Fotoğraflar</h2>
          <div className="grid grid-cols-2 gap-3">
            {fotolar.map((d, i) => (
              <figure key={d.id} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element -- özel kova, oturumlu uç */}
                <img src={`/api/saha/dosya/${d.id}`} alt={d.aciklama ?? `Fotoğraf ${i + 1}`} className="aspect-[4/3] w-full rounded object-cover" />
                <figcaption className="mt-1 text-[11px] text-murekkep-2">
                  Foto {i + 1} ·{' '}
                  {new Date(d.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' })}
                  {d.aciklama && ` · ${d.aciklama}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {z.saha_notu && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="mb-1 text-base font-semibold">Saha notları</h2>
          <p className="whitespace-pre-line">{z.saha_notu}</p>
        </section>
      )}

      <section className="mt-10 grid break-inside-avoid grid-cols-2 gap-10">
        {['Greentask temsilcisi', 'Tesis yetkilisi'].map((r) => (
          <div key={r}>
            <p className="text-xs text-soluk">{r}</p>
            <p className="mt-10 border-t border-murekkep pt-1 text-xs">Ad soyad · imza · tarih</p>
          </div>
        ))}
      </section>
    </main>
  );
}
