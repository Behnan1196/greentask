import type { Metadata } from 'next';
import Link from 'next/link';
import { bugun, gunFarki, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { SahaZiyareti, Tesis } from '@/lib/veri/tipler';
import { ZIYARET_DURUMU } from '@/lib/saha/durum';
import { ziyaretPlanla } from './eylemler';

export const metadata: Metadata = { title: 'Saha Ziyaretleri' };


const AMACLAR = ['Rutin ziyaret', 'İç tetkik', 'Eğitim', 'Denetim hazırlığı', 'Numune / ölçüm', 'Belge teslim alma'];
const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';

function Liste({
  baslik,
  liste,
  tesis,
  adi,
  gun,
}: {
  baslik: string;
  liste: SahaZiyareti[];
  tesis: Map<string, Tesis>;
  adi: Map<string, string>;
  gun: string;
}) {
  return liste.length ? (
      <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <h2 className="px-5 py-3.5 text-base font-semibold">
          {baslik} · {liste.length}
        </h2>
        <ul>
          {liste.map((z) => {
            const t = tesis.get(z.tesis_id);
            const k = gunFarki(gun, z.tarih);
            return (
              <li key={z.id} className="border-t border-cizgi-ince">
                <Link href={`/saha/${z.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 no-underline hover:bg-[#fafbf9]">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-murekkep">
                      <span className="font-mono text-xs text-soluk">{t?.gt_kod}</span> {t?.kisa_ad}
                    </span>
                    <span className="text-xs text-soluk">
                      {trTarih(z.tarih)}
                      {z.durum === 'planli' && (k === 0 ? ' · bugün' : k > 0 ? ` · ${k} gün sonra` : ` · ${-k} gün geçti`)} ·{' '}
                      {adi.get(z.ziyaretci_id ?? '') ?? 'Ziyaretçi seçilmemiş'}
                      {z.amac && ` · ${z.amac}`}
                    </span>
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ZIYARET_DURUMU[z.durum].sinif}`}>
                    {ZIYARET_DURUMU[z.durum].ad}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;
}

export default async function SahaZiyaretleri(props: PageProps<'/saha'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const sp = await props.searchParams;
  const seciliTesis = typeof sp.tesis === 'string' ? sp.tesis : '';
  const [ziyaretler, tesisler, ekip] = await Promise.all([depo.ziyaretler(), depo.tesisler(), depo.kullanicilar()]);
  const gun = bugun();
  const tesis = new Map(tesisler.map((t) => [t.id, t]));
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const planli = ziyaretler.filter((z) => z.durum === 'planli').sort((a, b) => a.tarih.localeCompare(b.tarih));
  const raporBekleyen = ziyaretler.filter((z) => z.durum === 'yapildi');
  const gecmis = ziyaretler.filter((z) => z.durum === 'raporlandi' || z.durum === 'iptal').slice(0, 30);


  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Saha Ziyaretleri</h1>
        <span className="text-sm text-murekkep-2">
          Gitmeden önce hazırlık listesi, sahada fotoğraf ve sesli not, dönüşte bulgu ve düzeltici faaliyetlerle tarihli rapor.
        </span>
      </header>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Liste baslik="Rapor bekleyen" liste={raporBekleyen} tesis={tesis} adi={adi} gun={gun} />
          <Liste baslik="Planlı" liste={planli} tesis={tesis} adi={adi} gun={gun} />
          <Liste baslik="Geçmiş" liste={gecmis} tesis={tesis} adi={adi} gun={gun} />
          {!ziyaretler.length && (
            <p className="rounded-xl border border-dashed border-[#a9afa6] bg-yuzey px-5 py-6 text-sm text-soluk">
              Henüz ziyaret yok. Sağdan ilk ziyareti planlayın.
            </p>
          )}
        </div>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="text-base font-semibold">Ziyaret planla</h2>
          <form action={ziyaretPlanla} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Tesis
              <select name="tesis_id" required defaultValue={seciliTesis} className={GIRDI}>
                <option value="" disabled>
                  Seçin…
                </option>
                {tesisler.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.gt_kod} {t.kisa_ad}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tarih
              <input type="date" name="tarih" required defaultValue={gun} className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ziyaret eden
              <select name="ziyaretci_id" defaultValue={kullanici.id} className={GIRDI}>
                {ekip.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad_soyad}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Amaç
              <input name="amac" list="amaclar" defaultValue="Rutin ziyaret" className={GIRDI} />
              <datalist id="amaclar">
                {AMACLAR.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </label>
            <button className="min-h-10 self-start rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu">
              Planla ve hazırlığı aç
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
