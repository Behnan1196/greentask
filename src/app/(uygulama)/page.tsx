import type { Metadata } from 'next';
import Link from 'next/link';
import { DurumRozeti, KalanGun, RiskEtiketi } from '@/components/rozetler';
import { bugun, trTarih, trUzunTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { riskli, sorumlusu, terminleriHesapla, type TerminSatiri } from '@/lib/veri/terminler';

export const metadata: Metadata = { title: 'Kokpit' };

const FILTRELER = [
  { kod: 'oncelikli', ad: 'Öncelikli (≤90 gün)' },
  { kod: 'gecikti', ad: 'Gecikmiş' },
  { kod: 'risk', ad: 'Cezai risk' },
  { kod: 'surecte', ad: 'Süreçte' },
  { kod: 'eksik', ad: 'Veri eksik' },
] as const;
type Filtre = (typeof FILTRELER)[number]['kod'];

const ONCELIKLI = new Set(['gecikti', 'acil', 'yaklasiyor']);

function filtrele(satirlar: TerminSatiri[], f: Filtre, tur?: string) {
  return satirlar.filter((s) => {
    if (tur && s.tur.kod !== tur) return false;
    switch (f) {
      case 'oncelikli':
        return ONCELIKLI.has(s.sonuc.durum);
      case 'gecikti':
        return s.sonuc.durum === 'gecikti';
      case 'risk':
        return ONCELIKLI.has(s.sonuc.durum) && riskli(s);
      case 'surecte':
        return s.sonuc.durum === 'surecte';
      case 'eksik':
        return s.sonuc.durum === 'veri_eksik';
    }
  });
}

function Kart({ baslik, deger, alt, renk }: { baslik: string; deger: number; alt: string; renk?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
      <span className="text-sm text-soluk">{baslik}</span>
      <span className={`font-mono text-3xl font-semibold ${renk ?? ''}`}>{deger}</span>
      <span className="text-sm text-murekkep-2">{alt}</span>
    </div>
  );
}

export default async function Kokpit(props: PageProps<'/'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const sp = await props.searchParams;
  const kim = typeof sp.kim === 'string' ? sp.kim : '';
  const filtre = (FILTRELER.find((f) => f.kod === sp.filtre)?.kod ?? 'oncelikli') as Filtre;
  const turSecimi = typeof sp.tur === 'string' && sp.tur ? sp.tur : undefined;

  const gun = bugun();
  const [tesisler, turler, kayitlar, olaylar, degisiklikler, ekip] = await Promise.all([
    depo.tesisler(),
    depo.turler(),
    depo.yukumlulukler(),
    depo.olaylar(),
    depo.mevzuatDegisiklikleri(),
    depo.kullanicilar(),
  ]);
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const hepsi = terminleriHesapla(kayitlar, turler, tesisler, olaylar, gun);
  const kimeGore = (s: TerminSatiri) => {
    const k = sorumlusu(s);
    if (kim === 'ben') return k === kullanici.id;
    if (kim === 'atanmamis') return !k;
    if (kim) return k === kim;
    return true;
  };
  const satirlar = filtrele(hepsi, filtre, turSecimi).filter(kimeGore);

  const say = (d: string) => hepsi.filter((s) => s.sonuc.durum === d).length;
  const gecikmis = hepsi.filter((s) => s.sonuc.durum === 'gecikti');
  const acikMevzuat = degisiklikler.filter((d) => d.durum === 'acik');
  const eksikTurleri = Object.entries(
    hepsi
      .filter((s) => s.sonuc.durum === 'veri_eksik')
      .reduce<Record<string, { ad: string; n: number }>>((acc, s) => {
        acc[s.tur.kod] = { ad: s.tur.ad, n: (acc[s.tur.kod]?.n ?? 0) + 1 };
        return acc;
      }, {}),
  ).sort((a, b) => b[1].n - a[1].n);

  const href = (f: Filtre, t = turSecimi) => {
    const q = new URLSearchParams();
    if (f !== 'oncelikli') q.set('filtre', f);
    if (t) q.set('tur', t);
    if (kim) q.set('kim', kim);
    const s = q.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <span className="text-sm text-soluk">{trUzunTarih(gun)}</span>
        <h1 className="text-3xl font-semibold tracking-tight">Kokpit</h1>
        <span className="text-sm text-murekkep-2">
          {tesisler.length} tesis · {turler.length} yükümlülük türü · terminler her açılışta güncel veriden hesaplanır
        </span>
      </header>

      <section aria-label="Özet" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Kart baslik="Gecikmiş" deger={gecikmis.length} alt={`${gecikmis.filter(riskli).length}'i cezai riskli`} renk="text-kirmizi" />
        <Kart baslik="30 gün içinde" deger={say('acil')} alt="aksiyon zamanı geldi" renk="text-turuncu" />
        <Kart baslik="31–90 gün" deger={say('yaklasiyor')} alt="hazırlık başlatılmalı" />
        <Kart baslik="Süreçte" deger={say('surecte')} alt="sunuldu / yanıt bekleniyor" renk="text-mavi" />
        <Kart baslik="Veri eksik" deger={say('veri_eksik')} alt="tarih girilmemiş kayıt" />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Terminler" className="min-w-0 flex-[999_1_640px] rounded-xl border border-cizgi bg-yuzey">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ebe5] px-5 py-4">
            <div role="group" aria-label="Filtre" className="flex flex-wrap gap-1.5">
              {FILTRELER.map((f) => (
                <Link
                  key={f.kod}
                  href={href(f.kod)}
                  aria-current={f.kod === filtre ? 'true' : undefined}
                  className={`rounded-full border px-3.5 py-2 text-sm no-underline ${
                    f.kod === filtre ? 'border-murekkep bg-murekkep text-white hover:text-white' : 'border-[#c9cec6] bg-white text-murekkep'
                  }`}
                >
                  {f.ad}
                </Link>
              ))}
            </div>
            <form className="flex flex-wrap items-center gap-2" action="/">
              {filtre !== 'oncelikli' && <input type="hidden" name="filtre" value={filtre} />}
              <label htmlFor="tur" className="text-sm text-soluk">
                Tür
              </label>
              <select id="tur" name="tur" defaultValue={turSecimi ?? ''} className="min-h-9 rounded-lg border border-[#c9cec6] bg-white px-2 text-sm">
                <option value="">Tümü</option>
                {turler.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.ad}
                  </option>
                ))}
              </select>
              <label htmlFor="kim" className="text-sm text-soluk">
                Sorumlu
              </label>
              <select id="kim" name="kim" defaultValue={kim} className="min-h-9 rounded-lg border border-[#c9cec6] bg-white px-2 text-sm">
                <option value="">Herkes</option>
                <option value="ben">Benimkiler</option>
                <option value="atanmamis">Atanmamış</option>
                {ekip.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad_soyad}
                  </option>
                ))}
              </select>
              <button className="min-h-9 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm">Uygula</button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-soluk">
                  <th className="px-5 py-2.5 font-medium">Aksiyona kalan</th>
                  <th className="px-3 py-2.5 font-medium">Tesis</th>
                  <th className="px-3 py-2.5 font-medium">Yükümlülük</th>
                  <th className="px-3 py-2.5 font-medium">Aksiyon</th>
                  <th className="px-3 py-2.5 font-medium">Son tarih</th>
                  <th className="px-3 py-2.5 font-medium">Sorumlu</th>
                  <th className="px-5 py-2.5 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => (
                  <tr key={s.kayit.id} className="border-t border-cizgi-ince align-top">
                    <td className="px-5 py-3">
                      {s.sonuc.durum === 'veri_eksik' ? <DurumRozeti durum="veri_eksik" /> : <KalanGun sonuc={s.sonuc} />}
                    </td>
                    <td className="px-3 py-3">
                      {s.tesis ? (
                        <Link href={`/tesisler/${s.tesis.gt_kod}`} className="font-medium no-underline">
                          <span className="font-mono text-xs text-soluk">{s.tesis.gt_kod}</span> {s.tesis.kisa_ad}
                        </Link>
                      ) : (
                        <span className="text-murekkep-2">Proje</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.tur.ad}
                      {s.kayit.etiket && <span className="block text-xs text-soluk">{s.kayit.etiket}</span>}
                    </td>
                    <td className="px-3 py-3 text-murekkep-2">
                      {s.sonuc.aksiyonAdi ? (
                        <>
                          {s.sonuc.aksiyonAdi} <span className="font-mono text-xs">{trTarih(s.sonuc.aksiyonTarihi)}</span>
                        </>
                      ) : (
                        s.sonuc.aciklama
                      )}
                      {s.kayit.notlar && <span className="block text-xs text-soluk">{s.kayit.notlar}</span>}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{trTarih(s.sonuc.sonTarih)}</td>
                    <td className="px-3 py-3 text-murekkep-2">{adi.get(sorumlusu(s) ?? '') ?? <span className="text-soluk">—</span>}</td>
                    <td className="px-5 py-3">
                      <RiskEtiketi risk={s.tur.cezai_risk} />
                    </td>
                  </tr>
                ))}
                {!satirlar.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-soluk">
                      Bu filtrede kayıt yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e8ebe5] px-5 py-3.5 text-sm text-soluk">{satirlar.length} kayıt</div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Açık mevzuat değişiklikleri · {acikMevzuat.length}</h2>
            {acikMevzuat.map((d) => (
              <Link key={d.id} href={`/mevzuat?acik=${d.id}#d-${d.id}`} className="flex flex-col gap-1 rounded-lg bg-[#fbf6ee] p-3 no-underline">
                <span className="text-xs font-semibold uppercase text-turuncu">
                  {d.tur} · RG {d.rg_metin}
                </span>
                <span className="text-sm font-medium text-murekkep">{d.ad}</span>
                <span className="text-sm text-murekkep-2">{d.etkilenen_tesisler}</span>
              </Link>
            ))}
          </section>
          <section className="flex flex-col gap-2.5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Veri eksikleri</h2>
            <p className="text-sm text-murekkep-2">Tarihi girilmemiş aktif kayıtlar. Doldurulmadıkça termin hesaplanamaz.</p>
            {eksikTurleri.map(([kod, v]) => (
              <Link key={kod} href={href('eksik', kod)} className="flex justify-between text-sm no-underline">
                <span className="text-murekkep">{v.ad}</span>
                <span className="font-mono">{v.n}</span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
