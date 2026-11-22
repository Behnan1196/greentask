import type { Metadata } from 'next';
import Link from 'next/link';
import { ayarlariAl, satirdanFaaliyet } from '@/lib/karbon/form';
import { hesapla, type Sonuc } from '@/lib/karbon/motor';
import { ton } from '@/lib/karbon/sunum';
import { oturumuDogrula } from '@/lib/veri/depo';
import { envanterOlustur } from './eylemler';

export const metadata: Metadata = { title: 'Karbon Envanteri' };

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';
const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';

export default async function KarbonSayfasi() {
  const { depo } = await oturumuDogrula();
  const [envanterler, tesisler] = await Promise.all([depo.envanterler(), depo.tesisler()]);
  const tesis = new Map(tesisler.map((t) => [t.id, t]));
  const sonuclar = await Promise.all(
    envanterler.map(async (e): Promise<Sonuc | null> => {
      if (e.kilit_sonucu) return e.kilit_sonucu as Sonuc;
      try {
        return hesapla((await depo.faaliyetler(e.id)).map(satirdanFaaliyet), ayarlariAl(e));
      } catch {
        return null;
      }
    }),
  );
  const buYil = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Karbon Envanteri</h1>
        <p className="max-w-3xl text-sm text-murekkep-2">
          Müşterinin kurumsal sera gazı envanteri, TS EN ISO 14064-1:2018 kategorilerine ve GHG Protocol kapsamlarına göre. Her satır hesap
          adımlarını ve faktör kaynağını taşır; kilitlenen envanter değiştirilemez ve rapora dönüşür.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <h2 className="px-5 py-3.5 text-base font-semibold">Envanterler · {envanterler.length}</h2>
        <ul>
          {envanterler.map((e, i) => {
            const s = sonuclar[i];
            const t = tesis.get(e.tesis_id);
            return (
              <li key={e.id} className="border-t border-cizgi-ince">
                <Link href={`/karbon/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 no-underline hover:bg-[#fafbf9]">
                  <span className="min-w-0 flex-[1_1_320px]">
                    <span className="block text-sm font-medium text-murekkep">{e.baslik}</span>
                    <span className="text-xs text-soluk">
                      {[t ? `${t.gt_kod} · ${t.kisa_ad}` : '—', `${e.yil}`, e.gwp].join(' · ')}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    {s && (
                      <span className="font-mono text-sm text-murekkep">
                        {ton(s.toplam, 1)} t CO₂e
                        <span className="ml-2 text-xs text-soluk">
                          K1 {ton(s.kapsam[1], 0)} · K2 {ton(s.kapsam[2], 0)} · K3 {ton(s.kapsam[3], 0)}
                        </span>
                      </span>
                    )}
                    <span className={`rounded-md px-2 py-0.5 font-semibold ${e.durum === 'kilitli' ? 'bg-yesil-acik text-yesil-koyu' : 'bg-turuncu-zemin text-turuncu'}`}>
                      {e.durum === 'kilitli' ? 'Kilitli' : 'Taslak'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!envanterler.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Henüz envanter yok. Aşağıdan ilkini açın.</p>}
      </section>

      <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4" open={!envanterler.length}>
        <summary className="cursor-pointer text-base font-semibold">Yeni envanter</summary>
        <form action={envanterOlustur} className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Müşteri / tesis
            <select name="tesis_id" required className={GIRDI}>
              <option value="">— seçin —</option>
              {tesisler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.gt_kod} · {t.kisa_ad}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Raporlama yılı
            <input name="yil" type="number" min={2000} max={2100} required defaultValue={buYil - 1} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            KÜP seti
            <select name="gwp" defaultValue="AR5" className={GIRDI}>
              <option value="AR5">IPCC AR5 (Türkiye envanteri, DEFRA)</option>
              <option value="AR6">IPCC AR6</option>
            </select>
          </label>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Başlık
            <input name="baslik" placeholder={`Kurumsal karbon ayak izi ${buYil - 1}`} className={GIRDI} />
          </label>
          <label className="col-span-full flex items-center gap-2 text-sm">
            <input type="checkbox" name="yakit_wtt" value="1" defaultChecked className="h-[18px] w-[18px] accent-yesil" />
            Yakıtların tedarik zinciri emisyonlarını (WTT) Kategori 4’e otomatik ekle
          </label>
          <button className={`${ANA} justify-self-start`}>Envanteri aç</button>
        </form>
      </details>
    </div>
  );
}
