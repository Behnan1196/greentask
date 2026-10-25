import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hazirlikListesi } from '@/lib/saha/hazirlik';
import { ONEM, ZIYARET_DURUMU } from '@/lib/saha/durum';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { terminleriHesapla } from '@/lib/veri/terminler';
import {
  bulguDurumu,
  bulguEkle,
  bulguSil,
  bulgudanGorev,
  dosyaSil,
  ziyaretDurumu,
  ziyaretMetniKaydet,
} from '../eylemler';
import { SahaYukleyici, YazdirButonu } from './yukleyici';

export const metadata: Metadata = { title: 'Saha ziyareti' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';
const BUTON = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm';
const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
const ADIMLAR = [
  { kod: 'hazirlik', ad: 'Hazırlık', alt: 'Bakılacaklar ve istenecekler' },
  { kod: 'saha', ad: 'Sahada', alt: 'Fotoğraf, sesli not, saha notu' },
  { kod: 'rapor', ad: 'Rapor', alt: 'Bulgular ve düzeltici faaliyetler' },
] as const;

export default async function ZiyaretSayfasi(props: PageProps<'/saha/[id]'>) {
  const { depo } = await oturumuDogrula();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const z = await depo.ziyaret(id);
  if (!z) notFound();
  const sp = await props.searchParams;
  const varsayilan = z.durum === 'planli' ? 'hazirlik' : 'rapor';
  const adim = ADIMLAR.find((a) => a.kod === sp.adim)?.kod ?? varsayilan;

  const tesisler = await depo.tesisler();
  const tesis = tesisler.find((t) => t.id === z.tesis_id);
  if (!tesis) notFound();
  const [ekip, kisiler, dosyalar, tumZiyaretler, turler, kayitlar, gorevler] = await Promise.all([
    depo.kullanicilar(),
    depo.kisiler(tesis.id),
    depo.dosyalar(id),
    depo.ziyaretler({ tesisId: tesis.id }),
    depo.turler(),
    depo.yukumlulukler(tesis.id),
    depo.gorevler({ acik: true }),
  ]);
  const [olaylar, bulgular] = await Promise.all([
    depo.olaylar(kayitlar.map((k) => k.id)),
    depo.bulgular(tumZiyaretler.map((x) => x.id)),
  ]);
  const gun = bugun();
  const buBulgular = bulgular.filter((b) => b.ziyaret_id === id);
  const fotolar = dosyalar.filter((d) => d.tur === 'foto');
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));
  const ziyaretTarihi = new Map(tumZiyaretler.map((x) => [x.id, x.tarih]));

  const hazirlik =
    adim === 'hazirlik'
      ? hazirlikListesi({
          terminler: terminleriHesapla(kayitlar, turler, [tesis], olaylar, gun),
          gorevler: gorevler.filter((g) => g.tesis_id === tesis.id),
          acikBulgular: bulgular
            .filter((b) => b.ziyaret_id !== id && b.durum === 'acik' && b.onem !== 'uygun')
            .map((b) => ({ bulgu: b.bulgu, termin: b.termin, ziyaretTarihi: ziyaretTarihi.get(b.ziyaret_id) ?? '' })),
        })
      : [];
  const karsilayacak = kisiler.filter((k) => k.imza_yetkisi).concat(kisiler.filter((k) => !k.imza_yetkisi)).slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/saha" className="text-sm no-underline print:hidden">
        ← Saha ziyaretleri
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-soluk">
            {trTarih(z.tarih)} · {adi.get(z.ziyaretci_id ?? '') ?? 'Ziyaretçi seçilmemiş'}
            {z.amac && ` · ${z.amac}`}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Saha ziyareti —{' '}
            <Link href={`/tesisler/${tesis.gt_kod}`} className="no-underline">
              {tesis.gt_kod} {tesis.kisa_ad}
            </Link>
          </h1>
          <span className={`self-start rounded-md px-2 py-0.5 text-xs font-semibold ${ZIYARET_DURUMU[z.durum].sinif}`}>
            {ZIYARET_DURUMU[z.durum].ad}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {z.durum === 'planli' && (
            <form action={ziyaretDurumu}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="durum" value="yapildi" />
              <button className={ANA}>Ziyaret yapıldı</button>
            </form>
          )}
          <a href={`/saha-rapor/${id}`} className={`${BUTON} inline-flex items-center no-underline`}>
            Raporu görüntüle / PDF
          </a>
          {z.durum === 'planli' && (
            <form action={ziyaretDurumu}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="durum" value="iptal" />
              <button className={BUTON}>İptal et</button>
            </form>
          )}
        </div>
      </header>

      <nav aria-label="Ziyaret adımları" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 print:hidden">
        {ADIMLAR.map((a, i) => (
          <Link
            key={a.kod}
            href={`/saha/${id}?adim=${a.kod}`}
            aria-current={a.kod === adim ? 'step' : undefined}
            className={`flex flex-col rounded-xl bg-yuzey px-4 py-3 no-underline ${
              a.kod === adim ? 'border-2 border-yesil' : 'border border-cizgi'
            }`}
          >
            <span className="text-xs text-soluk">Adım {i + 1}</span>
            <span className="font-semibold text-murekkep">{a.ad}</span>
            <span className="text-xs text-murekkep-2">
              {a.kod === 'saha' ? `${dosyalar.length} dosya` : a.kod === 'rapor' ? `${buBulgular.length} bulgu` : a.alt}
            </span>
          </Link>
        ))}
      </nav>

      {adim === 'hazirlik' && (
        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-xl border border-cizgi bg-yuzey px-6 py-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Bu ziyarette bakılacaklar</h2>
              <YazdirButonu />
            </div>
            {hazirlik.map((b) => (
              <div key={b.baslik} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-soluk">{b.baslik}</h3>
                {b.maddeler.map((m, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-yesil" />
                    <span className={m.kritik ? 'font-medium text-kirmizi' : ''}>{m.metin}</span>
                  </label>
                ))}
              </div>
            ))}
          </section>
          <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Karşılayacak kişiler</h2>
              {karsilayacak.map((k) => (
                <div key={k.id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{k.ad_soyad}</span>
                  {k.gorev && <span className="text-sm text-murekkep-2">{k.gorev}</span>}
                  {k.profil_notu && <span className="text-xs text-soluk">{k.profil_notu}</span>}
                  {k.telefon && (
                    <a href={`tel:+90${k.telefon.replace(/^0/, '')}`} className="font-mono text-xs no-underline">
                      {k.telefon}
                    </a>
                  )}
                </div>
              ))}
              {!karsilayacak.length && <p className="text-sm text-soluk">Kayıtlı kişi yok.</p>}
            </section>
            <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Önceki ziyaretler</h2>
              {tumZiyaretler
                .filter((x) => x.id !== id && x.durum !== 'iptal')
                .slice(0, 4)
                .map((x) => (
                  <Link key={x.id} href={`/saha/${x.id}`} className="flex justify-between text-sm no-underline">
                    <span>{trTarih(x.tarih)}</span>
                    <span className="text-soluk">{bulgular.filter((b) => b.ziyaret_id === x.id).length} bulgu</span>
                  </Link>
                ))}
              {tumZiyaretler.length <= 1 && <p className="text-sm text-soluk">Bu tesise ilk ziyaret.</p>}
            </section>
          </aside>
        </div>
      )}

      {adim === 'saha' && (
        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Fotoğraflar ve kayıtlar · {dosyalar.length}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {fotolar.map((d) => (
                <figure key={d.id} className="flex flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- özel kova, oturumlu uç */}
                  <img src={`/api/saha/dosya/${d.id}`} alt={d.aciklama ?? 'Saha fotoğrafı'} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-gri-zemin object-cover" />
                  <figcaption className="flex items-start justify-between gap-2 text-xs text-murekkep-2">
                    <span>
                      {new Date(d.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}
                      {d.aciklama && ` · ${d.aciklama}`}
                    </span>
                    <form action={dosyaSil}>
                      <input type="hidden" name="id" value={d.id} />
                      <button aria-label="Fotoğrafı sil" className="text-soluk hover:text-kirmizi">
                        Sil
                      </button>
                    </form>
                  </figcaption>
                </figure>
              ))}
            </div>
            {dosyalar
              .filter((d) => d.tur !== 'foto')
              .map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-[#f7f8f5] px-3 py-2">
                  {d.tur === 'ses' ? (
                    <audio controls preload="none" src={`/api/saha/dosya/${d.id}`} className="h-10 max-w-full" />
                  ) : (
                    <a href={`/api/saha/dosya/${d.id}`} className="text-sm">
                      Belge (PDF)
                    </a>
                  )}
                  <span className="flex-1 text-sm text-murekkep-2">{d.aciklama ?? (d.tur === 'ses' ? 'Sesli not' : '')}</span>
                  <form action={dosyaSil}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="text-xs text-soluk hover:text-kirmizi">Sil</button>
                  </form>
                </div>
              ))}
            {!dosyalar.length && <p className="text-sm text-soluk">Henüz dosya yok.</p>}
          </section>
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 max-md:order-first">
            <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Ekle</h2>
              <SahaYukleyici ziyaretId={id} />
            </section>
            <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Saha notu</h2>
              <form action={ziyaretMetniKaydet} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="alan" value="saha_notu" />
                <label className="sr-only" htmlFor="saha-notu">
                  Saha notu
                </label>
                <textarea id="saha-notu" name="metin" rows={6} defaultValue={z.saha_notu ?? ''} placeholder="Görülenler, konuşulanlar, teslim alınan belgeler…" className={`${GIRDI} py-2`} />
                <button className={`${BUTON} self-start`}>Kaydet</button>
              </form>
            </section>
          </aside>
        </div>
      )}

      {adim === 'rapor' && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Bulgular · {buBulgular.length}</h2>
            {buBulgular.map((b, i) => {
              const foto = dosyalar.find((d) => d.id === b.dosya_id);
              return (
                <article key={b.id} className="flex flex-wrap items-start gap-4 border-t border-cizgi-ince py-3">
                  {foto && (
                    // eslint-disable-next-line @next/next/no-img-element -- özel kova, oturumlu uç
                    <img src={`/api/saha/dosya/${foto.id}`} alt={foto.aciklama ?? ''} className="h-20 w-28 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-[1_1_320px]">
                    <p className="text-sm font-semibold">
                      {i + 1}. {b.bulgu}
                    </p>
                    {b.dayanak && <p className="text-xs text-soluk">Dayanak: {b.dayanak}</p>}
                    {b.duzeltici_faaliyet && <p className="text-sm text-murekkep-2">Düzeltici faaliyet: {b.duzeltici_faaliyet}</p>}
                    <p className="text-xs text-soluk">
                      {b.termin ? `Termin ${trTarih(b.termin)}` : 'Termin yok'}
                      {b.gorev_id && ' · görev açıldı'}
                    </p>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ONEM[b.onem].sinif}`}>{ONEM[b.onem].ad}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {b.onem !== 'uygun' && !b.gorev_id && (
                      <form action={bulgudanGorev}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="ziyaret_id" value={id} />
                        <button className="min-h-8 rounded-md border border-yesil bg-white px-2.5 text-xs text-yesil-koyu">Göreve çevir</button>
                      </form>
                    )}
                    {b.onem !== 'uygun' && (
                      <form action={bulguDurumu}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="durum" value={b.durum === 'acik' ? 'kapandi' : 'acik'} />
                        <button className="min-h-8 rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs">
                          {b.durum === 'acik' ? 'Giderildi' : 'Yeniden aç'}
                        </button>
                      </form>
                    )}
                    <form action={bulguSil}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="min-h-8 px-1.5 text-xs text-soluk hover:text-kirmizi">Sil</button>
                    </form>
                  </div>
                </article>
              );
            })}
            <form action={bulguEkle} className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 border-t border-cizgi pt-4">
              <input type="hidden" name="ziyaret_id" value={id} />
              <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
                Yeni bulgu
                <input name="bulgu" required placeholder="Örn. Tehlikeli atık varillerinde etiket ve giriş tarihi yok" className={`${GIRDI} font-normal`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Dayanak (mevzuat)
                <input name="dayanak" placeholder="Örn. Atık Yönetimi Yönetmeliği" className={GIRDI} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Önem
                <select name="onem" defaultValue="orta" className={GIRDI}>
                  <option value="yuksek">Yüksek</option>
                  <option value="orta">Orta</option>
                  <option value="dusuk">Düşük</option>
                  <option value="uygun">Uygun (olumlu tespit)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Termin
                <input type="date" name="termin" className={GIRDI} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Kanıt fotoğrafı
                <select name="dosya_id" defaultValue="" className={GIRDI}>
                  <option value="">—</option>
                  {fotolar.map((d, i) => (
                    <option key={d.id} value={d.id}>
                      {i + 1}. {d.aciklama ?? 'Fotoğraf'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-full flex flex-col gap-1 text-sm">
                Düzeltici faaliyet
                <input name="duzeltici_faaliyet" placeholder="Tesisin yapması gereken" className={GIRDI} />
              </label>
              <button className={`${ANA} justify-self-start`}>Bulgu ekle</button>
            </form>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Rapor özeti</h2>
            <form action={ziyaretMetniKaydet} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="alan" value="rapor_ozeti" />
              <label className="sr-only" htmlFor="rapor-ozeti">
                Rapor özeti
              </label>
              <textarea id="rapor-ozeti" name="metin" rows={4} defaultValue={z.rapor_ozeti ?? ''} placeholder="Genel değerlendirme, dosya kontrolü sonucu, teslim alınan belgeler…" className={`${GIRDI} py-2`} />
              <div className="flex flex-wrap gap-2">
                <button className={BUTON}>Kaydet</button>
              </div>
            </form>
            {z.durum !== 'raporlandi' && (
              <form action={ziyaretDurumu} className="border-t border-cizgi pt-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="durum" value="raporlandi" />
                <button className={ANA}>Raporu tamamla</button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
