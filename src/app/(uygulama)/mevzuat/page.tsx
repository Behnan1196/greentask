import type { Metadata } from 'next';
import Link from 'next/link';
import { etkilenenTesisler, mevzuatiBul } from '@/lib/mevzuat/etki';
import { trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { Gorev, Kullanici, MatrisHucresi, Mevzuat, MevzuatDegisikligi, SektorGrubu, Tesis } from '@/lib/veri/tipler';
import { degisiklikDurumu, degisiklikEkle, degisiklikGuncelle, etkiGorevleriAc, mevzuatEkle } from './eylemler';
import { ANA, DegisiklikAlanlari, GIRDI, MevzuatAlanlari, grupSirasi } from './formlar';

export const metadata: Metadata = { title: 'Mevzuat' };

const KUCUK = 'min-h-8 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs';
const GOREV_DURUMU = { acik: 'açık', devam: 'devam ediyor', tamamlandi: 'tamamlandı', iptal: 'iptal' } as const;
const kucuk = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLocaleLowerCase('tr');

function DegisiklikKarti({
  d,
  tesisler,
  gruplar,
  mevzuatlar,
  gorevler,
  adi,
  vurgulu,
}: {
  d: MevzuatDegisikligi;
  tesisler: Tesis[];
  gruplar: SektorGrubu[];
  mevzuatlar: Mevzuat[];
  gorevler: Gorev[];
  adi: Map<string, string>;
  vurgulu: boolean;
}) {
  const etkilenen = etkilenenTesisler(d, tesisler, gruplar.map((g) => g.kod));
  const onerilen = etkilenen.filter((e) => e.onerilen);
  const gorevi = new Map(gorevler.map((g) => [g.tesis_id, g]));
  const biten = gorevler.filter((g) => g.durum === 'tamamlandi' || g.durum === 'iptal').length;
  const kutuphane = mevzuatiBul(d, mevzuatlar);
  const acikDegil = d.durum === 'kapali';
  return (
    <article
      id={`d-${d.id}`}
      className={`flex scroll-mt-6 flex-col gap-3 rounded-xl bg-yuzey px-5 py-4 ${vurgulu ? 'border-2 border-yesil' : 'border border-cizgi'} ${acikDegil ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-turuncu">
            {[d.tur, d.rg_metin && `RG ${d.rg_metin}`, `tespit ${trTarih(d.tespit_tarihi)}`].filter(Boolean).join(' · ')}
          </span>
          <h3 className="text-base font-semibold">{d.ad}</h3>
          {d.ozet && <p className="text-sm text-murekkep-2">{d.ozet}</p>}
          {d.aksiyon && (
            <p className="text-sm">
              <span className="font-medium">Yapılacak:</span> {d.aksiyon}
            </p>
          )}
          {kutuphane && (
            <Link href={`/mevzuat/${kutuphane.id}`} className="text-xs no-underline">
              Kütüphanede: {kutuphane.ad} →
            </Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${acikDegil ? 'bg-gri-zemin text-gri' : 'bg-turuncu-zemin text-turuncu'}`}>
            {acikDegil ? 'Kapandı' : 'Açık'}
          </span>
          <form action={degisiklikDurumu}>
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="durum" value={acikDegil ? 'acik' : 'kapali'} />
            <button className={KUCUK}>{acikDegil ? 'Yeniden aç' : 'Kapat'}</button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-cizgi-ince pt-3">
        <p className="text-sm">
          <span className="font-medium">Etkilenen: {onerilen.length} tesis</span>
          {gorevler.length > 0 && (
            <span className="text-murekkep-2">
              {' '}
              · {gorevler.length} görev açıldı, {biten} tamamlandı
            </span>
          )}
          {!onerilen.length && <span className="text-soluk"> · etkilenen grup ya da tesis girilmemiş</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {onerilen.map(({ tesis }) => {
            const g = gorevi.get(tesis.id);
            return (
              <Link
                key={tesis.id}
                href={`/tesisler/${tesis.gt_kod}`}
                title={`${tesis.kisa_ad}${g ? ` · görev ${GOREV_DURUMU[g.durum]}` : ''}`}
                className={`rounded-md px-2 py-0.5 font-mono text-xs no-underline ${
                  !g ? 'bg-gri-zemin text-gri' : g.durum === 'tamamlandi' ? 'bg-yesil-acik text-yesil-koyu' : 'bg-turuncu-zemin text-turuncu'
                }`}
              >
                {tesis.gt_kod}
                {g && (g.durum === 'tamamlandi' ? ' ✓' : ' •')}
              </Link>
            );
          })}
        </div>
      </div>

      {!acikDegil && etkilenen.length > 0 && (
        <details className="rounded-lg bg-[#f7f8f5] px-4 py-3" open={vurgulu && !gorevler.length}>
          <summary className="cursor-pointer text-sm font-medium">Tesislere görev aç</summary>
          <form action={etkiGorevleriAc} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="id" value={d.id} />
            <fieldset className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-4 gap-y-1.5 text-sm">
              <legend className="sr-only">Görev açılacak tesisler</legend>
              {etkilenen.map(({ tesis, neden, onerilen: o }) => {
                const g = gorevi.get(tesis.id);
                return (
                  <label key={tesis.id} className={`flex items-start gap-2 ${g ? 'text-soluk' : ''}`}>
                    <input type="checkbox" name="tesis_id" value={tesis.id} defaultChecked={o && !g} disabled={!!g} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-yesil" />
                    <span>
                      <span className="font-mono text-xs">{tesis.gt_kod}</span> {tesis.kisa_ad}
                      <span className="block text-xs text-soluk">
                        {g
                          ? `görev var · ${GOREV_DURUMU[g.durum]}`
                          : [neden === 'grup' ? `grup ${tesis.grup_kod}` : neden === 'kod' ? 'adıyla yazılmış' : 'tüm portföy', adi.get(tesis.sorumlu_id ?? '') ?? 'sorumlu yok → size']
                              .filter(Boolean)
                              .join(' · ')}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Görev
                <input name="baslik" defaultValue={d.aksiyon ?? `${d.ad}: uygunluk kontrolü`} className={GIRDI} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Son tarih
                <input type="date" name="son_tarih" className={GIRDI} />
              </label>
              <button className={`${ANA} self-end justify-self-start`}>Seçili tesislere görev aç</button>
            </div>
            <p className="text-xs text-soluk">Her tesis için ayrı görev, tesisin sorumlusuna açılır ve “Benim İşlerim”e düşer.</p>
          </form>
        </details>
      )}

      <details>
        <summary className="cursor-pointer text-xs text-soluk">Düzenle</summary>
        <form action={degisiklikGuncelle} className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <input type="hidden" name="id" value={d.id} />
          <DegisiklikAlanlari gruplar={gruplar} mevzuatlar={mevzuatlar} d={d} />
          <button className={`${ANA} justify-self-start`}>Kaydet</button>
        </form>
      </details>
    </article>
  );
}

function Takip({ veri, acikId }: { veri: Veri; acikId?: string }) {
  const { degisiklikler, gorevler } = veri;
  const acik = degisiklikler.filter((d) => d.durum === 'acik');
  const kapali = degisiklikler.filter((d) => d.durum === 'kapali');
  const kart = (d: MevzuatDegisikligi) => (
    <DegisiklikKarti key={d.id} d={d} {...veri} gorevler={gorevler.filter((g) => g.mevzuat_degisikligi_id === d.id)} vurgulu={d.id === acikId} />
  );
  return (
    <div className="flex flex-col gap-4">
      <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
        <summary className="cursor-pointer text-base font-semibold">Yeni mevzuat değişikliği</summary>
        <form action={degisiklikEkle} className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <DegisiklikAlanlari gruplar={veri.gruplar} mevzuatlar={veri.mevzuatlar} />
          <button className={`${ANA} justify-self-start`}>Kaydet</button>
        </form>
      </details>
      <h2 className="text-lg font-semibold">Açık değişiklikler · {acik.length}</h2>
      {acik.map(kart)}
      {!acik.length && <p className="text-sm text-soluk">Açık değişiklik yok.</p>}
      {kapali.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-base font-semibold">Kapananlar · {kapali.length}</summary>
          <div className="mt-3 flex flex-col gap-3">{kapali.map(kart)}</div>
        </details>
      )}
    </div>
  );
}

function Kutuphane({ veri, sp }: { veri: Veri; sp: Record<string, string | string[] | undefined> }) {
  const { mevzuatlar, matris, gruplar, tesisler } = veri;
  const ara = typeof sp.q === 'string' ? sp.q.trim() : '';
  const kategori = typeof sp.kategori === 'string' ? sp.kategori : '';
  const grup = typeof sp.grup === 'string' ? sp.grup : '';
  const hucre = new Map(matris.map((h) => [`${h.mevzuat_id}|${h.grup_kod}`, h.uygulama]));
  const kategoriler = [...new Set(mevzuatlar.map((m) => m.kategori).filter((k): k is string => !!k))].sort((a, b) => a.localeCompare(b, 'tr'));
  const liste = mevzuatlar.filter(
    (m) =>
      (!ara || kucuk(`${m.ad} ${m.kapsam_notu ?? ''} ${m.rg_metin ?? ''}`).includes(kucuk(ara))) &&
      (!kategori || (kategori === '-' ? !m.kategori : m.kategori === kategori)) &&
      (!grup || hucre.has(`${m.id}|${grup}`)),
  );
  const kategorisiz = mevzuatlar.filter((m) => !m.kategori).length;
  const grupTesisleri = grup ? tesisler.filter((t) => t.grup_kod === grup) : [];
  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4" role="search">
        <input type="hidden" name="sekme" value="kutuphane" />
        <label className="flex min-w-0 flex-[2_1_240px] flex-col gap-1 text-sm">
          Ara
          <input name="q" defaultValue={ara} placeholder="Ad, kapsam, RG sayısı" className={GIRDI} />
        </label>
        <label className="flex flex-[1_1_180px] flex-col gap-1 text-sm">
          Kategori
          <select name="kategori" defaultValue={kategori} className={GIRDI}>
            <option value="">Tümü</option>
            {kategoriler.map((k) => (
              <option key={k}>{k}</option>
            ))}
            {kategorisiz > 0 && <option value="-">Kategorisiz ({kategorisiz})</option>}
          </select>
        </label>
        <label className="flex flex-[1_1_220px] flex-col gap-1 text-sm">
          Sektör grubu
          <select name="grup" defaultValue={grup} className={GIRDI}>
            <option value="">Tümü</option>
            {gruplar.map((g) => (
              <option key={g.kod} value={g.kod}>
                {g.kod} {g.ad}
              </option>
            ))}
          </select>
        </label>
        <button className={ANA}>Süz</button>
      </form>

      {grup && (
        <p className="text-sm text-murekkep-2">
          {grup} grubundaki tesisler: {grupTesisleri.map((t) => `${t.gt_kod} ${t.kisa_ad}`).join(', ') || 'yok'}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <caption className="px-5 py-3.5 text-left text-base font-semibold">
              {liste.length} mevzuat
              <span className="ml-2 text-xs font-normal text-soluk">X: doğrudan uygulanır · K: koşullu (tesisin faaliyetine bağlı)</span>
            </caption>
            <thead>
              <tr className="border-t border-cizgi text-left text-xs text-soluk">
                <th scope="col" className="px-5 py-2 font-medium">
                  Mevzuat
                </th>
                {gruplar.map((g) => (
                  <th key={g.kod} scope="col" title={g.ad} className={`w-10 px-1 py-2 text-center font-mono font-medium ${g.kod === grup ? 'text-yesil-koyu' : ''}`}>
                    {g.kod}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liste.map((m) => (
                <tr key={m.id} className="border-t border-cizgi-ince align-top hover:bg-[#fafbf9]">
                  <td className="px-5 py-2.5">
                    <Link href={`/mevzuat/${m.id}`} className="font-medium text-murekkep no-underline">
                      {m.ad}
                    </Link>
                    <span className="block text-xs text-soluk">
                      {[m.kategori ?? 'Kategorisiz', m.tur, m.rg_metin && `RG ${m.rg_metin}`].filter(Boolean).join(' · ')}
                      {m.teyit_gerekli && <span className="font-semibold text-turuncu"> · RG’den teyit edilmeli</span>}
                    </span>
                    {m.kapsam_notu && <span className="block max-w-[70ch] text-xs text-murekkep-2">{m.kapsam_notu}</span>}
                  </td>
                  {gruplar.map((g) => {
                    const v = hucre.get(`${m.id}|${g.kod}`);
                    return (
                      <td key={g.kod} className="px-1 py-2.5 text-center">
                        {v && (
                          <span
                            aria-label={`${g.kod}: ${v === 'X' ? 'doğrudan' : 'koşullu'}`}
                            className={`inline-block w-6 rounded font-mono text-xs font-semibold ${v === 'X' ? 'bg-yesil-acik text-yesil-koyu' : 'bg-mavi-zemin text-mavi'}`}
                          >
                            {v}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!liste.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Bu süzgeçle mevzuat bulunamadı.</p>}
      </section>

      <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
        <summary className="cursor-pointer text-base font-semibold">Kütüphaneye mevzuat ekle</summary>
        <form action={mevzuatEkle} className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <MevzuatAlanlari kategoriler={kategoriler} />
          <button className={`${ANA} justify-self-start`}>Ekle ve gruplarını seç</button>
        </form>
      </details>
    </div>
  );
}

type Veri = {
  degisiklikler: MevzuatDegisikligi[];
  mevzuatlar: Mevzuat[];
  matris: MatrisHucresi[];
  gruplar: SektorGrubu[];
  tesisler: Tesis[];
  gorevler: Gorev[];
  adi: Map<string, string>;
};

export default async function MevzuatSayfasi(props: PageProps<'/mevzuat'>) {
  const { depo } = await oturumuDogrula();
  const sp = await props.searchParams;
  const sekme = sp.sekme === 'kutuphane' ? 'kutuphane' : 'takip';
  const [degisiklikler, mevzuatlar, matris, gruplar, tesisler, gorevler, ekip] = await Promise.all([
    depo.mevzuatDegisiklikleri(),
    depo.mevzuatlar(),
    depo.mevzuatMatrisi(),
    depo.sektorGruplari(),
    depo.tesisler(),
    depo.gorevler({}),
    depo.kullanicilar(),
  ]);
  const veri: Veri = {
    degisiklikler,
    mevzuatlar,
    matris,
    gruplar: gruplar.sort((a, b) => grupSirasi(a.kod, b.kod)),
    tesisler,
    gorevler: gorevler.filter((g) => g.mevzuat_degisikligi_id),
    adi: new Map(ekip.map((k: Kullanici) => [k.id, k.ad_soyad])),
  };
  const acikSayisi = degisiklikler.filter((d) => d.durum === 'acik').length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Mevzuat</h1>
        <p className="max-w-3xl text-sm text-murekkep-2">
          Resmî Gazete’de tespit edilen değişiklikler, hangi tesisleri etkiledikleri ve bunun için açılan görevler. Kütüphane, her mevzuatın
          hangi sektör grubuna uygulandığını gösterir; tesis kartları bu tablodan beslenir.
        </p>
      </header>
      <nav aria-label="Mevzuat bölümleri" className="flex gap-2">
        {[
          { kod: 'takip', ad: 'Değişiklik takibi', alt: `${acikSayisi} açık` },
          { kod: 'kutuphane', ad: 'Kütüphane', alt: `${mevzuatlar.length} mevzuat` },
        ].map((s) => (
          <Link
            key={s.kod}
            href={`/mevzuat?sekme=${s.kod}`}
            aria-current={s.kod === sekme ? 'page' : undefined}
            className={`flex flex-[0_1_240px] flex-col rounded-xl bg-yuzey px-4 py-3 no-underline ${s.kod === sekme ? 'border-2 border-yesil' : 'border border-cizgi'}`}
          >
            <span className="font-semibold text-murekkep">{s.ad}</span>
            <span className="text-xs text-murekkep-2">{s.alt}</span>
          </Link>
        ))}
      </nav>
      {sekme === 'takip' ? <Takip veri={veri} acikId={typeof sp.acik === 'string' ? sp.acik : undefined} /> : <Kutuphane veri={veri} sp={sp} />}
    </div>
  );
}
