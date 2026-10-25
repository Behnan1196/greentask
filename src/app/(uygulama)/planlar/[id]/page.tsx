import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GorevSatiri } from '@/components/gorev-satiri';
import { BULGU_KATEGORI, BULGU_ONEMI, ICERIK_TURU, OGE_DURUMU, PLAN_DURUMU, VERI_KAYNAGI } from '@/lib/plan/durum';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { PlanBulgusu, PlanOgesiSatiri } from '@/lib/veri/tipler';
import { bulguDurumu, bulgudanGorev, planGuncelle, revizyonMaddeleriEkle } from '../eylemler';
import { PlanAlanlari } from '../plan-alanlari';
import { OgeFormu, PlanYukleyici } from './istemci';

export const metadata: Metadata = { title: 'İşletme planı' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';
const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
const KUCUK = 'min-h-8 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs';
const SEKMELER = [
  { kod: 'harita', ad: 'Plan haritası' },
  { kod: 'revizyon', ad: 'Revizyon maddeleri' },
  { kod: 'tarama', ad: 'Hata taraması' },
  { kod: 'surumler', ad: 'Sürümler' },
] as const;
const FILTRELER = [
  { kod: 'tumu', ad: 'Tümü', uyar: () => true },
  { kod: 'degisecek', ad: 'Değişecekler', uyar: (o: PlanOgesiSatiri) => ['kontrol', 'guncellenecek', 'eklenecek'].includes(o.durum) },
  { kod: 'veri', ad: 'Veri tabloları', uyar: (o: PlanOgesiSatiri) => o.icerik_turu === 'veri_tablosu' },
  { kod: 'tablo', ad: 'Tablolar', uyar: (o: PlanOgesiSatiri) => o.tur === 'tablo' },
  { kod: 'sekil', ad: 'Şekiller', uyar: (o: PlanOgesiSatiri) => o.tur === 'sekil' },
] as const;

const tarihi = (z: string | Date) => trTarih(new Date(z).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }));
const mb = (b: number | string) => `${(Number(b) / 1048576).toFixed(1)} MB`;

function Bulgu({ b, planId, gorevVar }: { b: PlanBulgusu; planId: string; gorevVar: boolean }) {
  const parcalar = (b.detay ?? '').split(' · ').filter(Boolean);
  return (
    <article className={`flex flex-col gap-1.5 border-t border-cizgi-ince py-3 ${b.durum !== 'acik' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-[1_1_320px] text-sm font-semibold">
          <span className="mr-2 rounded bg-gri-zemin px-1.5 py-0.5 text-xs font-medium text-gri">{BULGU_KATEGORI[b.kategori] ?? b.kategori}</span>
          {b.baslik}
        </h3>
        {b.onem !== 'dusuk' && (
          <div className="flex flex-wrap gap-1.5">
            {b.durum === 'acik' && !gorevVar && (
              <form action={bulgudanGorev}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="plan_id" value={planId} />
                <input type="hidden" name="baslik" value={b.baslik} />
                <input type="hidden" name="detay" value={b.detay ?? ''} />
                <input type="hidden" name="oneri" value={b.oneri ?? ''} />
                <button className={`${KUCUK} border-yesil text-yesil-koyu`}>Göreve çevir</button>
              </form>
            )}
            {b.durum === 'acik' ? (
              <>
                <form action={bulguDurumu}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="durum" value="duzeltildi" />
                  <button className={KUCUK}>Düzeltildi</button>
                </form>
                <form action={bulguDurumu}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="durum" value="yoksay" />
                  <button className={`${KUCUK} text-soluk`}>Hata değil</button>
                </form>
              </>
            ) : (
              <form action={bulguDurumu}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="durum" value="acik" />
                <button className={KUCUK}>{b.durum === 'duzeltildi' ? 'Düzeltildi · geri al' : 'Yok sayıldı · geri al'}</button>
              </form>
            )}
          </div>
        )}
      </div>
      {parcalar.length > 1 ? (
        <ul className="ml-4 list-disc text-sm text-murekkep-2">
          {parcalar.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ) : (
        parcalar[0] && <p className="text-sm text-murekkep-2">{parcalar[0]}</p>
      )}
      {b.oneri && <p className="text-xs text-soluk">Ne yapılmalı: {b.oneri}</p>}
    </article>
  );
}

export default async function PlanSayfasi(props: PageProps<'/planlar/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const plan = await depo.plan(id);
  if (!plan) notFound();
  const sp = await props.searchParams;
  const [surumler, ogeler, gorevler, tesisler, ekip] = await Promise.all([
    depo.planSurumleri(id),
    depo.planOgeleri(id),
    depo.gorevler({ isletmePlaniId: id }),
    depo.tesisler(),
    depo.kullanicilar(),
  ]);
  const son = surumler[0];
  const sekme = SEKMELER.find((s) => s.kod === sp.sekme)?.kod ?? (son ? 'harita' : 'surumler');
  const seciliSurum = surumler.find((s) => s.id === sp.surum) ?? son;
  const bulgular = seciliSurum ? await depo.planBulgulari(seciliSurum.id) : [];
  const oncekiSurum = seciliSurum ? surumler[surumler.indexOf(seciliSurum) + 1] : undefined;
  const oncekiBulgular = oncekiSurum ? await depo.planBulgulari(oncekiSurum.id) : [];

  const gun = bugun();
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const planTesisleri = tesisler.filter((t) => plan.tesis_idleri.includes(t.id));
  const acikGorev = gorevler.filter((g) => g.durum === 'acik' || g.durum === 'devam');
  const acikBulgu = bulgular.filter((b) => b.durum === 'acik' && b.onem !== 'dusuk');
  const gorevBasliklari = new Set(gorevler.map((g) => g.baslik));
  const ogeGorevi = new Map<string, number>();
  for (const g of acikGorev) if (g.plan_ogesi_id) ogeGorevi.set(g.plan_ogesi_id, (ogeGorevi.get(g.plan_ogesi_id) ?? 0) + 1);
  const ogeNo = new Map(ogeler.map((o) => [o.id, o.numara ?? o.ad]));

  const filtre = FILTRELER.find((f) => f.kod === sp.filtre) ?? FILTRELER[0];
  const gorunen = ogeler.filter(filtre.uyar);
  const sayim = Object.fromEntries(Object.keys(OGE_DURUMU).map((k) => [k, ogeler.filter((o) => o.durum === k).length]));
  const sayac = { harita: `${ogeler.length} öğe`, revizyon: `${acikGorev.length} açık`, tarama: `${acikBulgu.length} açık bulgu`, surumler: `${surumler.length} sürüm` };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/planlar" className="text-sm no-underline">
        ← İşletme planları
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm text-soluk">
            {[
              planTesisleri.map((t) => `${t.gt_kod} ${t.kisa_ad}`).join(', ') || 'Tesis seçilmemiş',
              plan.onayli_surum && `onaylı sürüm: ${plan.onayli_surum}`,
              adi.get(plan.hazirlayan_id ?? '') && `hazırlayan: ${adi.get(plan.hazirlayan_id ?? '')}`,
              plan.sunum_tarihi && `sunum: ${trTarih(plan.sunum_tarihi)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">{plan.baslik}</h1>
          <span className={`self-start rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_DURUMU[plan.durum].sinif}`}>{PLAN_DURUMU[plan.durum].ad}</span>
        </div>
        {son && (
          <a href={`/api/planlar/surum/${son.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-[#c9cec6] bg-white px-3 text-sm no-underline">
            Son sürümü indir (.docx)
          </a>
        )}
      </header>

      <nav aria-label="Plan bölümleri" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
        {SEKMELER.map((s) => (
          <Link
            key={s.kod}
            href={`/planlar/${id}?sekme=${s.kod}`}
            aria-current={s.kod === sekme ? 'page' : undefined}
            className={`flex flex-col rounded-xl bg-yuzey px-4 py-3 no-underline ${s.kod === sekme ? 'border-2 border-yesil' : 'border border-cizgi'}`}
          >
            <span className="font-semibold text-murekkep">{s.ad}</span>
            <span className="text-xs text-murekkep-2">{sayac[s.kod]}</span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          {!son && (
            <section className="rounded-xl border-2 border-dashed border-cizgi bg-yuzey px-6 py-5">
              <h2 className="text-lg font-semibold">Önce planın Word dosyasını yükleyin</h2>
              <p className="text-sm text-murekkep-2">
                Bakanlığa sunulan son (onaylı) Word dosyasıyla başlayın. Sistem bölüm, tablo ve şekil listesini çıkarır ve hata taraması yapar.
                Sonraki her revizyonda yeni dosyayı yükleyin: harita güncellenir, işaretleriniz ve notlarınız korunur.
              </p>
            </section>
          )}

          {sekme === 'harita' && son && (
            <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
              <div className="flex flex-col gap-3 px-5 py-4">
                <p className="text-sm text-murekkep-2">
                  Revizyonda her bölüm, tablo ve şekil için ne yapılacağını işaretleyin.{' '}
                  {Object.entries(OGE_DURUMU)
                    .filter(([k]) => sayim[k])
                    .map(([k, v]) => `${sayim[k]} ${v.ad.toLocaleLowerCase('tr')}`)
                    .join(' · ')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtre">
                  {FILTRELER.map((f) => (
                    <Link
                      key={f.kod}
                      href={`/planlar/${id}?sekme=harita&filtre=${f.kod}`}
                      aria-current={f.kod === filtre.kod ? 'true' : undefined}
                      className={`rounded-full px-3 py-1 text-xs no-underline ${
                        f.kod === filtre.kod ? 'bg-yesil font-semibold text-white' : 'border border-cizgi text-murekkep'
                      }`}
                    >
                      {f.ad} · {ogeler.filter(f.uyar).length}
                    </Link>
                  ))}
                </div>
              </div>
              <ul>
                {gorunen.map((o) => {
                  const ana = o.tur === 'bolum' && !o.bolum;
                  const eksik = o.son_gorulen_surum !== son.id;
                  return (
                    <li key={o.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cizgi-ince px-5 py-2.5 ${ana ? 'bg-[#f7f8f5]' : ''}`}>
                      <div className={`min-w-0 flex-[1_1_300px] ${o.tur === 'bolum' && !ana ? 'pl-4' : o.tur !== 'bolum' ? 'pl-8' : ''}`}>
                        <p className={`text-sm ${ana ? 'font-semibold' : ''}`}>
                          {o.numara && <span className="mr-1.5 font-mono text-xs text-soluk">{o.numara}</span>}
                          {o.ad}
                        </p>
                        <p className="text-xs text-soluk">
                          {[
                            o.tur !== 'bolum' && ICERIK_TURU[o.icerik_turu],
                            o.veri_kaynagi && `sistemden: ${VERI_KAYNAGI[o.veri_kaynagi] ?? o.veri_kaynagi}`,
                            ogeGorevi.get(o.id) && `${ogeGorevi.get(o.id)} açık görev`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          {eksik && <span className="font-semibold text-kirmizi"> · son sürümde yok</span>}
                        </p>
                      </div>
                      <div className="min-w-0 flex-[1_1_320px]">
                        <OgeFormu key={`${o.id}-${o.durum}`} id={o.id} durum={o.durum} notlar={o.notlar} ad={`${o.numara ?? ''} ${o.ad}`.trim()} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!gorunen.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Bu filtrede öğe yok.</p>}
            </section>
          )}

          {sekme === 'revizyon' && (
            <>
              <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
                <h2 className="text-base font-semibold">Revizyon maddesi ekle</h2>
                <form action={revizyonMaddeleriEkle} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                  <input type="hidden" name="plan_id" value={id} />
                  <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
                    Her satır bir madde
                    <textarea
                      name="maddeler"
                      required
                      rows={6}
                      placeholder={'Tablo 17 depo gazı ölçümleri 2025 verileriyle güncellenecek\n5.2 Sızıntı suyu arıtma kapasitesi yeni ünite ile yazılacak\nŞekil 31 yeni vaziyet planı eklenecek'}
                      className={`${GIRDI} py-2 font-normal`}
                    />
                    <span className="text-xs font-normal text-soluk">
                      “Tablo 17”, “Şekil 3” ya da “5.2” ile başlayan satır o öğeye bağlanır ve haritada “Güncellenecek” olarak işaretlenir.
                      Bakanlık yazısındaki maddeleri doğrudan yapıştırabilirsiniz.
                    </span>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Sorumlu
                    <select name="sorumlu_id" defaultValue={plan.hazirlayan_id ?? ''} className={GIRDI}>
                      <option value="">Hazırlayan</option>
                      {ekip.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.ad_soyad}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Son tarih
                    <input type="date" name="son_tarih" defaultValue={plan.sunum_tarihi ?? ''} className={GIRDI} />
                  </label>
                  <button className={`${ANA} self-end justify-self-start`}>Maddeleri ekle</button>
                </form>
              </section>
              <section className="flex flex-col rounded-xl border border-cizgi bg-yuzey px-5 py-4">
                <h2 className="pb-1 text-base font-semibold">
                  Maddeler · {acikGorev.length} açık / {gorevler.length}
                </h2>
                <div className="divide-y divide-cizgi-ince">
                  {gorevler.map((g) => (
                    <GorevSatiri
                      key={g.id}
                      g={g}
                      bugun={gun}
                      kisi={adi.get(g.sorumlu_id ?? '')}
                      ek={g.plan_ogesi_id ? ogeNo.get(g.plan_ogesi_id) ?? undefined : undefined}
                    />
                  ))}
                </div>
                {!gorevler.length && <p className="text-sm text-soluk">Henüz madde yok. Maddeler herkesin “Benim İşlerim” listesine de düşer.</p>}
              </section>
            </>
          )}

          {sekme === 'tarama' && seciliSurum && (
            <section className="flex flex-col rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">
                {seciliSurum === son ? 'Son sürümün taraması' : 'Eski sürümün taraması'} · {seciliSurum.dosya_adi}
              </h2>
              <p className="pb-2 text-sm text-murekkep-2">
                {tarihi(seciliSurum.created_at)} · {acikBulgu.length} açık bulgu
                {oncekiSurum &&
                  ` · önceki sürümde ${oncekiBulgular.filter((b) => b.onem !== 'dusuk').length} bulgu vardı`}
                . Tarama biçimsel ve hesapsal hataları bulur; içeriğin mevzuata uygunluğunu değerlendirmez.
              </p>
              {(['yuksek', 'orta', 'dusuk'] as const).map((onem) => {
                const liste = bulgular.filter((b) => b.onem === onem);
                if (!liste.length) return null;
                return (
                  <div key={onem} className="flex flex-col pt-3">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-soluk">
                      <span className={`rounded px-1.5 py-0.5 normal-case tracking-normal ${BULGU_ONEMI[onem].sinif}`}>{BULGU_ONEMI[onem].ad}</span>
                      {liste.length}
                    </h3>
                    {liste.map((b) => (
                      <Bulgu key={b.id} b={b} planId={id} gorevVar={gorevBasliklari.has(b.baslik)} />
                    ))}
                  </div>
                );
              })}
              {!bulgular.length && <p className="text-sm text-soluk">Bu sürümde bulgu yok.</p>}
            </section>
          )}

          {sekme === 'surumler' && surumler.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
              <h2 className="px-5 py-3.5 text-base font-semibold">Yüklenen sürümler</h2>
              <ul>
                {surumler.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-cizgi-ince px-5 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {s.dosya_adi}
                        {i === 0 && <span className="ml-2 rounded bg-yesil-acik px-1.5 py-0.5 text-xs text-yesil-koyu">güncel</span>}
                      </span>
                      <span className="text-xs text-soluk">
                        {[
                          tarihi(s.created_at),
                          adi.get(s.created_by ?? ''),
                          mb(s.boyut),
                          s.ozet.bolum != null && `${s.ozet.bolum} bölüm`,
                          s.ozet.tablo != null && `${s.ozet.tablo} tablo`,
                          s.ozet.sekil != null && `${s.ozet.sekil} şekil`,
                          s.ozet.bulgu != null && `${s.ozet.bulgu} bulgu`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="flex gap-2 text-sm">
                      <Link href={`/planlar/${id}?sekme=tarama&surum=${s.id}`} className="no-underline">
                        Tarama
                      </Link>
                      <a href={`/api/planlar/surum/${s.id}`} className="no-underline">
                        İndir
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">{son ? 'Yeni sürüm yükle' : 'Word dosyasını yükle'}</h2>
            <PlanYukleyici planId={id} />
          </section>
          <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <summary className="cursor-pointer text-base font-semibold">Plan bilgileri</summary>
            <form action={planGuncelle} className="mt-3 grid gap-3">
              <input type="hidden" name="id" value={id} />
              <PlanAlanlari tesisler={tesisler} ekip={ekip} d={plan} />
              <button className={`${ANA} justify-self-start`}>Kaydet</button>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
