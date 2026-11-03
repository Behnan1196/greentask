import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KURAL_TIPI_ADI, kuralOzeti } from '@/lib/termin/ozet';
import { oturumuDogrula } from '@/lib/veri/depo';
import { isKartiKaydet, turKaydet } from '../eylemler';
import { ANA, GIRDI, IsKartiAlanlari, KuralAlanlari } from '../formlar';

export const metadata: Metadata = { title: 'Kılavuz' };

const RISKLER = { yok: 'Yok', dusuk: 'Düşük', var: 'Var', yuksek: 'Yüksek' } as const;

export default async function TurKilavuzu(props: PageProps<'/kilavuz/[kod]'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const { kod } = await props.params;
  const [turler, kartlar, kayitlar, tesisler] = await Promise.all([depo.turler({ pasiflerDahil: true }), depo.isKartlari(), depo.yukumlulukler(), depo.tesisler()]);
  const t = turler.find((x) => x.kod === decodeURIComponent(kod));
  if (!t) notFound();
  const kart = kartlar.find((k) => k.tur_id === t.id);
  const kapali = kullanici.rol !== 'yonetici';
  const tesisAdi = new Map(tesisler.map((x) => [x.id, x]));
  const izleyen = kayitlar
    .filter((k) => k.tur_id === t.id && k.durum === 'aktif' && k.tesis_id && tesisAdi.has(k.tesis_id))
    .map((k) => ({ k, tesis: tesisAdi.get(k.tesis_id!)! }))
    .sort((a, b) => a.tesis.gt_kod.localeCompare(b.tesis.gt_kod));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/kilavuz" className="text-sm no-underline">
        ← Kılavuz
      </Link>
      <header className="flex flex-col gap-1.5">
        <span className="text-sm text-soluk">{KURAL_TIPI_ADI[t.kural_tipi]}</span>
        <h1 className="text-3xl font-semibold tracking-tight">{t.ad}</h1>
        <p className="text-sm text-murekkep-2">{kuralOzeti(t.kural_tipi, t.parametreler)}</p>
        {t.mevzuat_dayanagi && <p className="text-sm text-soluk">Dayanak: {t.mevzuat_dayanagi}</p>}
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <h2 className="text-base font-semibold">İş kartı</h2>
          <p className="text-sm text-soluk">Tesis kartında bu yükümlülüğün altında “Nasıl yapılır” olarak görünür. Herkes düzenleyebilir.</p>
          <form action={isKartiKaydet} className="flex flex-col gap-3">
            {kart && <input type="hidden" name="id" value={kart.id} />}
            <input type="hidden" name="tur_id" value={t.id} />
            <input type="hidden" name="baslik" value={t.ad} />
            <IsKartiAlanlari k={kart} baslikGoster={false} />
            <button className={`${ANA} self-start`}>İş kartını kaydet</button>
          </form>
        </section>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Takvim kuralı</h2>
            {kapali && <p className="text-sm text-soluk">Kuralları yönetici değiştirir.</p>}
            <form action={turKaydet} className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <input type="hidden" name="id" value={t.id} />
              <label className="col-span-full flex flex-col gap-1 text-sm">
                Ad
                <input name="ad" required defaultValue={t.ad} disabled={kapali} className={GIRDI} />
              </label>
              <KuralAlanlari tip={t.kural_tipi} p={t.parametreler} kapali={kapali} />
              <label className="flex flex-col gap-1 text-sm">
                Cezai risk
                <select name="cezai_risk" defaultValue={t.cezai_risk} disabled={kapali} className={GIRDI}>
                  {Object.entries(RISKLER).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Sıra
                <input name="sira" type="number" defaultValue={t.sira} disabled={kapali} className={GIRDI} />
              </label>
              <label className="col-span-full flex flex-col gap-1 text-sm">
                Mevzuat dayanağı
                <input name="mevzuat_dayanagi" defaultValue={t.mevzuat_dayanagi ?? ''} disabled={kapali} className={GIRDI} />
              </label>
              <label className="col-span-full flex flex-col gap-1 text-sm">
                Klasör (belgenin yeri)
                <input name="hedef_klasor" defaultValue={t.hedef_klasor ?? ''} disabled={kapali} className={GIRDI} />
              </label>
              <label className="col-span-full flex flex-col gap-1 text-sm">
                Açıklama
                <input name="aciklama" defaultValue={t.aciklama ?? ''} disabled={kapali} className={GIRDI} />
              </label>
              <label className="col-span-full flex items-center gap-2 text-sm">
                <input type="checkbox" name="aktif" defaultChecked={t.aktif} disabled={kapali} className="h-[18px] w-[18px] accent-yesil" />
                Kullanımda (kaldırılırsa yeni tesislerde önerilmez; mevcut kayıtlar durur)
              </label>
              {!kapali && <button className={`${ANA} justify-self-start`}>Kuralı kaydet</button>}
            </form>
            <p className="text-xs text-soluk">Tesise özel istisna (örn. bir tesiste 3 ay önce sunum) kural yerine o tesisin kaydında tutulur.</p>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Bu yükümlülüğü izleyen tesisler · {izleyen.length}</h2>
            {izleyen.map(({ k, tesis }) => (
              <Link key={k.id} href={`/tesisler/${tesis.gt_kod}`} className="text-sm no-underline">
                <span className="font-mono text-xs text-soluk">{tesis.gt_kod}</span> {tesis.kisa_ad}
                {k.etiket && <span className="text-soluk"> · {k.etiket}</span>}
              </Link>
            ))}
            {!izleyen.length && <p className="text-sm text-soluk">Henüz hiçbir tesise eklenmemiş. Tesis kartındaki “Yükümlülük ekle” ile eklenir.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
