import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { YazdirButonu } from '@/app/(uygulama)/saha/[id]/yukleyici';
import { mevzuatiBul } from '@/lib/mevzuat/etki';
import { bugun, trTarih, trUzunTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';

export const metadata: Metadata = { title: 'Mevzuat bilgi notu' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tesise özel mevzuat bilgi notu (A4, yazdırılır / PDF olarak kaydedilir). */
export default async function BilgiNotu(props: PageProps<'/mevzuat-notu/[id]'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tesisId = typeof sp.tesis === 'string' ? sp.tesis : '';
  if (!UUID.test(id) || !UUID.test(tesisId)) notFound();
  const [degisiklikler, tesisler, mevzuatlar, kisiler] = await Promise.all([
    depo.mevzuatDegisiklikleri(),
    depo.tesisler({ pasiflerDahil: true }),
    depo.mevzuatlar(),
    depo.kisiler(tesisId),
  ]);
  const d = degisiklikler.find((x) => x.id === id);
  const t = tesisler.find((x) => x.id === tesisId);
  if (!d || !t) notFound();
  const kutuphane = mevzuatiBul(d, mevzuatlar);
  const muhatap = kisiler.find((k) => k.imza_yetkisi) ?? kisiler[0];

  return (
    <main className="mx-auto max-w-[820px] bg-white px-10 py-10 text-[13.5px] leading-relaxed text-murekkep print:max-w-none print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 18mm 16mm; } @media print { body { background: #fff; } }`}</style>
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <a href={`/mevzuat?acik=${d.id}#d-${d.id}`} className="text-sm no-underline">
          ← Mevzuat
        </a>
        <YazdirButonu etiket="Yazdır / PDF olarak kaydet" />
      </div>

      <header className="flex items-start justify-between gap-6 border-b-2 border-murekkep pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-yesil-koyu">Greentask Enerji Danışmanlık</p>
          <h1 className="text-2xl font-semibold">Mevzuat Bilgi Notu</h1>
        </div>
        <p className="text-right text-xs text-murekkep-2">{trUzunTarih(bugun())}</p>
      </header>

      <p className="mt-5">
        <span className="font-semibold">Sayın {muhatap ? muhatap.ad_soyad : 'Yetkili'},</span>
        <br />
        {t.resmi_unvan ?? t.kisa_ad}
      </p>

      <p className="mt-4">
        Tesisinizi ilgilendiren aşağıdaki düzenleme Resmî Gazete’de yayımlanmıştır. Değişikliğin özeti, tesisiniz açısından yapılması
        gerekenler ve uyum tarihi aşağıda yer almaktadır.
      </p>

      <table className="mt-5 w-full border-collapse">
        <tbody>
          {[
            ['Düzenleme', d.ad],
            ['Türü', d.tur ?? '—'],
            ['Resmî Gazete', d.rg_metin ?? '—'],
            ['İlgili mevzuat', kutuphane?.ad ?? '—'],
            ['Uyum için son tarih', d.uyum_tarihi ? trTarih(d.uyum_tarihi) : 'Belirtilmemiş / yürürlük tarihinden itibaren'],
          ].map(([a, b]) => (
            <tr key={a} className="border-b border-cizgi align-top">
              <th className="w-44 py-2 pr-4 text-left font-medium text-soluk">{a}</th>
              <td className="py-2">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {d.ozet && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">Ne değişti</h2>
          <p className="whitespace-pre-line">{d.ozet}</p>
        </section>
      )}
      {d.aksiyon && (
        <section className="mt-5">
          <h2 className="mb-1 text-base font-semibold">Tesisiniz için yapılması gerekenler</h2>
          <p className="whitespace-pre-line">{d.aksiyon}</p>
        </section>
      )}

      <p className="mt-6">
        Uyum sürecini sizinle birlikte planlayacağız. Sorularınız için bize her zaman ulaşabilirsiniz.
      </p>
      <p className="mt-6">
        Saygılarımızla,
        <br />
        <span className="font-semibold">{kullanici.ad_soyad}</span>
        <br />
        Greentask Enerji Danışmanlık A.Ş.
      </p>
      <p className="mt-10 border-t border-cizgi pt-2 text-[11px] text-soluk">
        Bu not bilgilendirme amaçlıdır; düzenlemenin bağlayıcı metni Resmî Gazete’de yayımlanan metindir.
      </p>
    </main>
  );
}
