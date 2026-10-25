import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GorevSatiri } from '@/components/gorev-satiri';
import { KalanGun } from '@/components/rozetler';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { riskli, terminleriHesapla } from '@/lib/veri/terminler';
import { devredenGorevler } from '@/lib/veri/toplanti';
import { maddeEkle, maddeKarariKaydet, maddeSil, maddedenGorev, toplantiDurumu, toplantiNotuKaydet } from '../eylemler';

export const metadata: Metadata = { title: 'Toplantı' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';
const BUTON = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm';
const KAYNAK = { elle: null, sistem: 'Sistemden', mevzuat: 'Mevzuat' } as const;

export default async function ToplantiSayfasi(props: PageProps<'/toplantilar/[id]'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const toplanti = await depo.toplanti(id);
  if (!toplanti) notFound();

  const gun = bugun();
  const [maddeler, toplantilar, gorevler, ekip, tesisler, turler, kayitlar, olaylar, degisiklikler] = await Promise.all([
    depo.maddeler(id),
    depo.toplantilar(),
    depo.gorevler({ toplantidan: true }),
    depo.kullanicilar(),
    depo.tesisler(),
    depo.turler(),
    depo.yukumlulukler(),
    depo.olaylar(),
    depo.mevzuatDegisiklikleri(),
  ]);
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const tesisAdi = new Map(tesisler.map((t) => [t.id, `${t.gt_kod} ${t.kisa_ad}`]));
  const toplantiTarihi = new Map(toplantilar.map((t) => [t.id, t.tarih]));

  // Önceki toplantılardan kalan açık görevler
  const devreden = devredenGorevler(gorevler, toplantilar, toplanti);


  // Sistemin işaretledikleri: gecikmiş ve cezai riskli terminler, gündemde olmayanlar
  const gundemdekiler = new Set(maddeler.map((m) => m.tesis_yukumluluk_id).filter(Boolean));
  const isaretli = terminleriHesapla(kayitlar, turler, tesisler, olaylar, gun)
    .filter((s) => s.sonuc.durum === 'gecikti' && riskli(s) && !gundemdekiler.has(s.kayit.id))
    .slice(0, 8);
  const gundemdekiMevzuat = new Set(maddeler.filter((m) => m.kaynak === 'mevzuat').map((m) => m.baslik));
  const acikMevzuat = degisiklikler.filter((d) => d.durum === 'acik' && !gundemdekiMevzuat.has(d.ad)).slice(0, 4);
  const kapali = toplanti.durum === 'kapandi';

  return (
    <div className="flex flex-col gap-6">
      <Link href="/toplantilar" className="text-sm no-underline">
        ← Toplantılar
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-soluk">{trTarih(toplanti.tarih)}</span>
          <h1 className="text-3xl font-semibold tracking-tight">{toplanti.baslik}</h1>
          <span className="text-sm text-murekkep-2">
            {maddeler.length} madde · {gorevler.filter((g) => g.toplanti_id === id).length} görev · {devreden.length} devreden görev
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/toplantilar/${id}/tutanak`} className={`${BUTON} inline-flex items-center no-underline`}>
            Tutanağı indir (.md)
          </a>
          <form action={toplantiDurumu}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="durum" value={kapali ? 'acik' : 'kapandi'} />
            <button
              className={
                kapali
                  ? BUTON
                  : 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu'
              }
            >
              {kapali ? 'Yeniden aç' : 'Toplantıyı kapat'}
            </button>
          </form>
        </div>
      </header>
      {kapali && (
        <p className="rounded-lg bg-gri-zemin px-4 py-3 text-sm text-gri">
          Bu toplantı kapandı. Tutanağı indirip <code>05_Toplanti_Notlari</code> klasörüne kaydedebilirsiniz.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
          {devreden.length > 0 && (
            <section className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="mb-1 text-base font-semibold">Önceki toplantılardan devreden · {devreden.length}</h2>
              <div className="divide-y divide-cizgi-ince">
                {devreden.map((g) => (
                  <GorevSatiri
                    key={g.id}
                    g={g}
                    bugun={gun}
                    kisi={adi.get(g.sorumlu_id ?? '') ?? 'Atanmamış'}
                    ek={`${trTarih(toplantiTarihi.get(g.toplanti_id!) ?? null)} toplantısı${g.tesis_id ? ` · ${tesisAdi.get(g.tesis_id)}` : ''}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Gündem · {maddeler.length}</h2>
            {maddeler.map((m, i) => {
              const mg = gorevler.filter((g) => g.toplanti_maddesi_id === m.id);
              return (
                <article key={m.id} className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">
                        {i + 1}. {m.baslik}
                      </h3>
                      <p className="text-xs text-soluk">
                        {[KAYNAK[m.kaynak], m.tesis_id ? tesisAdi.get(m.tesis_id) : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <form action={maddeSil}>
                      <input type="hidden" name="id" value={m.id} />
                      <button aria-label={`“${m.baslik}” maddesini sil`} className="text-xs text-soluk hover:text-kirmizi">
                        Sil
                      </button>
                    </form>
                  </div>
                  <form action={maddeKarariKaydet} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="flex flex-col gap-1 text-sm">
                      Görüşülen / karar
                      <textarea name="karar" rows={2} defaultValue={m.karar ?? ''} className={`${GIRDI} py-2`} />
                    </label>
                    <button className={`${BUTON} self-start`}>Kararı kaydet</button>
                  </form>
                  <div className="divide-y divide-cizgi-ince border-t border-cizgi pt-1">
                    {mg.map((g) => (
                      <GorevSatiri key={g.id} g={g} bugun={gun} kisi={adi.get(g.sorumlu_id ?? '') ?? 'Atanmamış'} />
                    ))}
                  </div>
                  <form action={maddedenGorev} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="toplanti_id" value={id} />
                    <input type="hidden" name="toplanti_maddesi_id" value={m.id} />
                    {m.tesis_id && <input type="hidden" name="tesis_id" value={m.tesis_id} />}
                    <label className="flex min-w-0 flex-[2_1_220px] flex-col gap-1 text-sm">
                      Görev
                      <input name="baslik" required placeholder="Kim, neyi yapacak?" className={GIRDI} />
                    </label>
                    <label className="flex flex-[1_1_140px] flex-col gap-1 text-sm">
                      Kime
                      <select name="sorumlu_id" defaultValue={kullanici.id} className={GIRDI}>
                        {ekip.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.ad_soyad}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-[1_1_140px] flex-col gap-1 text-sm">
                      Son tarih
                      <input type="date" name="son_tarih" className={GIRDI} />
                    </label>
                    <button className={BUTON}>Görev ekle</button>
                  </form>
                </article>
              );
            })}
            <form action={maddeEkle} className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[#a9afa6] bg-yuzey px-5 py-4">
              <input type="hidden" name="toplanti_id" value={id} />
              <label className="flex min-w-0 flex-[2_1_260px] flex-col gap-1 text-sm font-medium">
                Yeni gündem maddesi
                <input name="baslik" required placeholder="Örn. Teams arşiv tasnifi pilotu" className={`${GIRDI} font-normal`} />
              </label>
              <label className="flex flex-[1_1_200px] flex-col gap-1 text-sm">
                Tesis (isteğe bağlı)
                <select name="tesis_id" defaultValue="" className={GIRDI}>
                  <option value="">—</option>
                  {tesisler.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.gt_kod} {t.kisa_ad}
                    </option>
                  ))}
                </select>
              </label>
              <button className="min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu">Ekle</button>
            </form>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Sistemin işaretledikleri</h2>
            <p className="text-xs text-soluk">Gecikmiş ve cezai riskli terminler. Tek tıkla gündeme alınır.</p>
            {isaretli.map((s) => (
              <form key={s.kayit.id} action={maddeEkle} className="flex items-start justify-between gap-2 border-t border-cizgi-ince py-2">
                <input type="hidden" name="toplanti_id" value={id} />
                <input type="hidden" name="kaynak" value="sistem" />
                <input type="hidden" name="tesis_yukumluluk_id" value={s.kayit.id} />
                {s.tesis && <input type="hidden" name="tesis_id" value={s.tesis.id} />}
                <input
                  type="hidden"
                  name="baslik"
                  value={`${s.tur.ad}${s.kayit.etiket ? ` (${s.kayit.etiket})` : ''}: ${s.sonuc.aksiyonAdi ?? ''} gecikti`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.tesis ? `${s.tesis.gt_kod} ${s.tesis.kisa_ad}` : s.kayit.etiket}</p>
                  <p className="text-xs text-murekkep-2">{s.tur.ad}</p>
                  <KalanGun sonuc={s.sonuc} />
                </div>
                <button className="min-h-8 shrink-0 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs">Gündeme al</button>
              </form>
            ))}
            {!isaretli.length && <p className="text-sm text-soluk">İşaretlenecek gecikmiş riskli termin yok.</p>}
            {acikMevzuat.length > 0 && <h3 className="mt-2 text-sm font-semibold">Açık mevzuat değişiklikleri</h3>}
            {acikMevzuat.map((d) => (
              <form key={d.id} action={maddeEkle} className="flex items-start justify-between gap-2 border-t border-cizgi-ince py-2">
                <input type="hidden" name="toplanti_id" value={id} />
                <input type="hidden" name="kaynak" value="mevzuat" />
                <input type="hidden" name="baslik" value={d.ad} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.ad}</p>
                  <p className="text-xs text-soluk">{d.aksiyon}</p>
                </div>
                <button className="min-h-8 shrink-0 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs">Gündeme al</button>
              </form>
            ))}
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Toplantı notu</h2>
            <form action={toplantiNotuKaydet} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={id} />
              <label className="sr-only" htmlFor="notlar">
                Toplantı notu
              </label>
              <textarea
                id="notlar"
                name="notlar"
                rows={5}
                defaultValue={toplanti.notlar ?? ''}
                placeholder="Katılımcılar, genel notlar…"
                className={`${GIRDI} py-2`}
              />
              <button className={`${BUTON} self-start`}>Kaydet</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
