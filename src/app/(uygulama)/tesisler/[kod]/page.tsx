import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DurumRozeti, KalanGun, RiskEtiketi } from '@/components/rozetler';
import type { KuralTipi } from '@/lib/termin/motor';
import { bugun, gunFarki, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { imzaliNushaBekleyen, terminleriHesapla, type TerminSatiri } from '@/lib/veri/terminler';
import { IsKartiGoster } from '@/components/is-karti';
import { etkilenenTesisler, tesisMevzuati } from '@/lib/mevzuat/etki';
import { PLAN_DURUMU } from '@/lib/plan/durum';
import { ZIYARET_DURUMU } from '@/lib/saha/durum';
import type { GorusmeKanali, IsKarti, Kullanici } from '@/lib/veri/tipler';
import { KisiAlanlariFormu, TesisAlanlariFormu } from '../tesis-formu';
import {
  gorusmeEkle,
  gorusmeSil,
  kisiKaydet,
  kisiSil,
  olayEkle,
  olaySil,
  tesisAktiflik,
  tesisBilgileriKaydet,
  tesisSorumlusuKaydet,
  yukumlulukEkle,
  yukumlulukKaydet,
  yukumlulukSil,
} from './eylemler';

export async function generateMetadata(props: PageProps<'/tesisler/[kod]'>): Promise<Metadata> {
  const { kod } = await props.params;
  return { title: kod };
}

const OLAY_ADLARI: Record<string, string> = {
  gerceklesti: 'Gerçekleşti / yapıldı',
  sunuldu: 'Sunuldu / başvuruldu',
  eksiklik_geldi: 'Eksiklik geldi',
  eksiklik_yanitlandi: 'Eksikliğe dönüldü',
  onaylandi: 'Onaylandı',
  imzali_teslim: 'İmzalı nüsha teslim alındı',
  not: 'Not',
};

const TARIH_ALANLARI: Record<KuralTipi, { ad: 'gecerlilik_bitis' | 'belge_tarihi' | 'son_islem' | 'baslangic'; etiket: string }[]> = {
  bitis_tarihi: [{ ad: 'gecerlilik_bitis', etiket: 'Geçerlilik bitişi' }],
  son_islem_periyot: [{ ad: 'son_islem', etiket: 'Son ölçüm / numune / rapor' }],
  sozlesme_takvimi: [{ ad: 'baslangic', etiket: 'Sözleşme tarihi (tesisten farklıysa)' }],
  yenilenen_sozlesme: [{ ad: 'baslangic', etiket: 'Sözleşme tarihi' }],
  donemsel_rapor: [{ ad: 'baslangic', etiket: 'İzleme başlangıcı' }],
  yillik_sabit_tarih: [],
};

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';
const BUTON = 'min-h-10 rounded-lg px-4 text-sm';

const KANAL: Record<GorusmeKanali, string> = { telefon: 'Telefon', eposta: 'E-posta', yuz_yuze: 'Yüz yüze', diger: 'Diğer' };

function YukumlulukSatiri({ s, gtKod, ekip, kart, gun }: { s: TerminSatiri; gtKod: string; ekip: Kullanici[]; kart?: IsKarti; gun: string }) {
  const imzaBekleyen = imzaliNushaBekleyen(s, gun);
  const tesisSorumlusu = ekip.find((k) => k.id === s.tesis?.sorumlu_id);
  const kayitSorumlusu = ekip.find((k) => k.id === s.kayit.sorumlu_id);
  const alanlar = [...TARIH_ALANLARI[s.tur.kural_tipi]];
  if (s.tur.kural_tipi === 'bitis_tarihi' && s.tur.parametreler.gecerlilik_ay) {
    alanlar.push({ ad: 'belge_tarihi', etiket: `Belge tarihi (+${s.tur.parametreler.gecerlilik_ay} ay)` });
  }
  return (
    <details className="group border-t border-cizgi-ince">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-start gap-3 px-5 py-3 hover:bg-[#fafbf9] max-md:grid-cols-1">
        <span>
          <span className="font-medium">{s.tur.ad}</span>
          {s.kayit.etiket && <span className="block text-xs text-soluk">{s.kayit.etiket}</span>}
          <span className="block text-xs text-soluk">
            <RiskEtiketi risk={s.tur.cezai_risk} /> risk{s.tur.hedef_klasor ? ` · ${s.tur.hedef_klasor}` : ''}
          </span>
          {kayitSorumlusu && <span className="block text-xs text-mavi">Sorumlu: {kayitSorumlusu.ad_soyad}</span>}
          {imzaBekleyen && (
            <span className="mt-1 inline-block rounded bg-turuncu-zemin px-1.5 py-0.5 text-xs font-semibold text-turuncu">
              İmzalı nüsha bekleniyor ({trTarih(imzaBekleyen)} işleminden)
            </span>
          )}
        </span>
        <span className="font-mono text-xs leading-6">
          {s.sonuc.sonTarih ? `Son: ${trTarih(s.sonuc.sonTarih)}` : '—'}
          {s.sonuc.aksiyonTarihi && s.sonuc.aksiyonTarihi !== s.sonuc.sonTarih && (
            <span className="block">
              {s.sonuc.aksiyonAdi}: {trTarih(s.sonuc.aksiyonTarihi)}
            </span>
          )}
        </span>
        <span className="text-sm text-murekkep-2">
          {s.sonuc.aciklama}
          {s.kayit.notlar && <span className="block text-xs text-soluk">{s.kayit.notlar}</span>}
        </span>
        <span className="flex items-center gap-2">
          {s.sonuc.kalanGunAksiyon != null ? <KalanGun sonuc={s.sonuc} /> : <DurumRozeti durum={s.sonuc.durum} />}
          <span aria-hidden="true" className="text-soluk transition group-open:rotate-90">›</span>
        </span>
      </summary>

      <div className="flex flex-wrap gap-6 bg-[#fafbf9] px-5 pb-5 pt-2">
        {kart && (
          <div className="flex min-w-[260px] flex-[1_1_100%] flex-col gap-2 rounded-lg border border-cizgi bg-white px-4 py-3">
            <h3 className="text-sm font-semibold">Nasıl yapılır</h3>
            <IsKartiGoster k={kart} kompakt baglanti={`/kilavuz/${s.tur.kod}`} />
          </div>
        )}
        {!kart && (
          <p className="flex-[1_1_100%] text-xs text-soluk">
            Bu yükümlülüğün iş kartı yok.{' '}
            <Link href={`/kilavuz/${s.tur.kod}`} className="no-underline">
              Kılavuzda oluşturun →
            </Link>
          </p>
        )}
        <form action={yukumlulukKaydet} className="flex min-w-[280px] flex-[1_1_320px] flex-col gap-3">
          <input type="hidden" name="id" value={s.kayit.id} />
          <input type="hidden" name="gt_kod" value={gtKod} />
          <h3 className="text-sm font-semibold">Kaydı düzenle</h3>
          {alanlar.map((a) => (
            <label key={a.ad} className="flex flex-col gap-1 text-sm">
              {a.etiket}
              <input type="date" name={a.ad} defaultValue={s.kayit[a.ad] ?? ''} className={GIRDI} />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            Durum
            <select name="durum" defaultValue={s.kayit.durum} className={GIRDI}>
              <option value="aktif">Aktif (takip ediliyor)</option>
              <option value="beklemede">Beklemede (henüz lisans yok vb.)</option>
              <option value="muaf">Muaf</option>
              <option value="kapsam_disi">Kapsam dışı</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sorumlu
            <select name="sorumlu_id" defaultValue={s.kayit.sorumlu_id ?? ''} className={GIRDI}>
              <option value="">Tesis sorumlusu{tesisSorumlusu ? ` (${tesisSorumlusu.ad_soyad})` : ' (atanmamış)'}</option>
              {ekip.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad_soyad}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Not
            <textarea name="notlar" defaultValue={s.kayit.notlar ?? ''} rows={2} className={`${GIRDI} py-2`} />
          </label>
          <button className={`${BUTON} self-start bg-yesil font-semibold text-white hover:bg-yesil-koyu`}>Kaydet</button>
        </form>

        <div className="flex min-w-[280px] flex-[1_1_320px] flex-col gap-3">
          <h3 className="text-sm font-semibold">Geçmiş</h3>
          {s.olaylar.length ? (
            <ul className="flex flex-col gap-1.5">
              {[...s.olaylar].reverse().map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-mono text-xs">{trTarih(o.tarih)}</span> · {OLAY_ADLARI[o.tur]}
                    {o.aciklama && <span className="text-soluk"> — {o.aciklama}</span>}
                  </span>
                  <form action={olaySil}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="gt_kod" value={gtKod} />
                    <button aria-label={`${trTarih(o.tarih)} kaydını sil`} className="text-xs text-soluk hover:text-kirmizi">
                      Sil
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-soluk">Kayıtlı olay yok.</p>
          )}
          <form action={olayEkle} className="flex flex-wrap items-end gap-2 border-t border-cizgi pt-3">
            <input type="hidden" name="tesis_yukumluluk_id" value={s.kayit.id} />
            <input type="hidden" name="gt_kod" value={gtKod} />
            <label className="flex flex-col gap-1 text-sm">
              Tarih
              <input type="date" name="tarih" required className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Olay
              <select name="tur" className={GIRDI}>
                {Object.entries(OLAY_ADLARI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-[1_1_160px] flex-col gap-1 text-sm">
              Açıklama
              <input name="aciklama" className={GIRDI} />
            </label>
            <button className={`${BUTON} border border-[#c9cec6] bg-white`}>Ekle</button>
          </form>
          <details className="border-t border-cizgi pt-3">
            <summary className="cursor-pointer text-xs text-soluk">Kaydı sil</summary>
            <form action={yukumlulukSil} className="mt-2 flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={s.kayit.id} />
              <input type="hidden" name="gt_kod" value={gtKod} />
              <label className="flex items-center gap-2 text-xs text-murekkep-2">
                <input type="checkbox" name="onay" required className="h-4 w-4 accent-kirmizi" />
                Kayıt ve geçmişi silinsin (artık takip edilmeyecekse silmek yerine durumu “Kapsam dışı” yapın)
              </label>
              <button className="min-h-8 rounded-md border border-kirmizi bg-white px-2.5 text-xs text-kirmizi">Sil</button>
            </form>
          </details>
        </div>
      </div>
    </details>
  );
}

export default async function TesisKarti(props: PageProps<'/tesisler/[kod]'>) {
  const { depo } = await oturumuDogrula();
  const { kod } = await props.params;
  const tesis = await depo.tesis(decodeURIComponent(kod));
  if (!tesis) notFound();

  const [turler, kayitlar, kisiler, ekip, ziyaretler, planlar, mevzuatlar, matris, degisiklikler, gruplar, isKartlari, gorusmeler] = await Promise.all([
    depo.turler(),
    depo.yukumlulukler(tesis.id),
    depo.kisiler(tesis.id),
    depo.kullanicilar(),
    depo.ziyaretler({ tesisId: tesis.id }),
    depo.planlar(),
    depo.mevzuatlar(),
    depo.mevzuatMatrisi(),
    depo.mevzuatDegisiklikleri(),
    depo.sektorGruplari(),
    depo.isKartlari(),
    depo.gorusmeler({ tesisId: tesis.id }),
  ]);
  const gun = bugun();
  const kartlar = new Map(isKartlari.filter((k) => k.tur_id).map((k) => [k.tur_id!, k]));
  const kisiAdi = new Map(kisiler.map((k) => [k.id, k.ad_soyad]));
  const temaslar = [
    ...gorusmeler.map((g) => g.tarih),
    ...ziyaretler.filter((z) => z.durum === 'yapildi' || z.durum === 'raporlandi').map((z) => z.tarih),
  ].sort();
  const sonTemas = temaslar[temaslar.length - 1];
  const uygulanan = tesisMevzuati(tesis, mevzuatlar, matris);
  const etkileyen = degisiklikler.filter(
    (d) => d.durum === 'acik' && etkilenenTesisler(d, [tesis], gruplar.map((g) => g.kod)).some((e) => e.onerilen),
  );
  const olaylar = await depo.olaylar(kayitlar.map((k) => k.id));
  const terminler = terminleriHesapla(kayitlar, turler, [tesis], olaylar, gun);
  const takipte = terminler.filter((s) => ['muaf', 'kapsam_disi'].indexOf(s.sonuc.durum) < 0);
  const disarida = terminler.filter((s) => ['muaf', 'kapsam_disi'].indexOf(s.sonuc.durum) >= 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/tesisler" className="text-sm no-underline">
        ← Tesisler
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-murekkep px-2 py-0.5 font-mono text-sm text-white">{tesis.gt_kod}</span>
          {tesis.grup_kod && <span className="rounded-md bg-yesil-acik px-2 py-0.5 text-sm text-yesil-koyu">{tesis.grup_notu ?? tesis.grup_kod}</span>}
          {tesis.sinif && <span className="rounded-md bg-gri-zemin px-2 py-0.5 text-sm text-gri">{tesis.sinif}</span>}
          {tesis.firma_grubu && <span className="rounded-md bg-gri-zemin px-2 py-0.5 text-sm text-gri">{tesis.firma_grubu}</span>}
          {!tesis.aktif && <span className="rounded-md bg-kirmizi-zemin px-2 py-0.5 text-sm font-semibold text-kirmizi">Pasif</span>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{tesis.kisa_ad}</h1>
        <p className="text-sm text-murekkep-2">
          {[tesis.resmi_unvan, tesis.il, tesis.nace_kodlari && `NACE ${tesis.nace_kodlari}`].filter(Boolean).join(' · ')}
        </p>
        <p className="text-sm text-soluk">
          Sözleşme: {trTarih(tesis.sozlesme_tarihi)}
          {tesis.sozlesme_kapsami && ` · ${tesis.sozlesme_kapsami}`}
          {tesis.izin_lisans_konusu && ` · İzin konusu: ${tesis.izin_lisans_konusu}`}
        </p>
        {tesis.notlar && <p className="text-sm text-murekkep-2">{tesis.notlar}</p>}
        <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Tesis bilgilerini düzenle</summary>
          <form action={tesisBilgileriKaydet} className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <input type="hidden" name="tesis_id" value={tesis.id} />
            <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
            <TesisAlanlariFormu t={tesis} gruplar={gruplar} />
            <button className={`${BUTON} self-end justify-self-start bg-yesil font-semibold text-white hover:bg-yesil-koyu`}>Kaydet</button>
          </form>
          <form action={tesisAktiflik} className="mt-4 flex flex-wrap items-center gap-3 border-t border-cizgi pt-3">
            <input type="hidden" name="tesis_id" value={tesis.id} />
            <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
            <input type="hidden" name="aktif" value={tesis.aktif ? 'false' : 'true'} />
            <span className="text-xs text-soluk">
              {tesis.aktif
                ? 'Sözleşmesi biten tesisi pasife alın: listelerden, kokpitten ve takvimlerden düşer, kayıtları korunur.'
                : 'Bu tesis pasif; listelerde ve kokpitte görünmüyor.'}
            </span>
            <button className={`${BUTON} border border-[#c9cec6] bg-white`}>{tesis.aktif ? 'Pasife al' : 'Yeniden aktifleştir'}</button>
          </form>
        </details>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Yükümlülükler" className="min-w-0 flex-[999_1_640px] overflow-hidden rounded-xl border border-cizgi bg-yuzey">
          <div className="flex items-baseline justify-between px-5 py-4">
            <h2 className="text-base font-semibold">Yükümlülükler · {takipte.length}</h2>
            <span className="text-xs text-soluk">Satıra tıklayınca tarihleri ve geçmişi düzenleyebilirsiniz</span>
          </div>
          {takipte.map((s) => (
            <YukumlulukSatiri key={s.kayit.id} s={s} gtKod={tesis.gt_kod} ekip={ekip} kart={kartlar.get(s.tur.id)} gun={gun} />
          ))}
          {disarida.length > 0 && (
            <>
              <h2 className="border-t border-cizgi px-5 pb-1 pt-4 text-sm font-semibold text-soluk">Muaf / kapsam dışı · {disarida.length}</h2>
              {disarida.map((s) => (
                <YukumlulukSatiri key={s.kayit.id} s={s} gtKod={tesis.gt_kod} ekip={ekip} kart={kartlar.get(s.tur.id)} gun={gun} />
              ))}
            </>
          )}
          {!terminler.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Bu tesiste henüz izlenen yükümlülük yok.</p>}
          <form action={yukumlulukEkle} className="flex flex-wrap items-end gap-2 border-t border-cizgi bg-[#fafbf9] px-5 py-4">
            <input type="hidden" name="tesis_id" value={tesis.id} />
            <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
            <label className="flex min-w-0 flex-[2_1_240px] flex-col gap-1 text-sm">
              Yükümlülük ekle
              <select name="tur_id" required defaultValue="" className={GIRDI}>
                <option value="" disabled>
                  Tür seçin…
                </option>
                {turler.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ad}
                    {kayitlar.some((k) => k.tur_id === t.id) ? ' (zaten var — ikinci kayıt için etiket girin)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-[1_1_180px] flex-col gap-1 text-sm">
              Etiket (isteğe bağlı)
              <input name="etiket" placeholder="Örn. Baca 2, Elektrik üretim" className={GIRDI} />
            </label>
            <button className={`${BUTON} border border-[#c9cec6] bg-white`}>Ekle</button>
          </form>
        </section>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <section className="flex flex-col gap-2.5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Greentask sorumlusu</h2>
            <form action={tesisSorumlusuKaydet} className="flex flex-wrap gap-2">
              <input type="hidden" name="tesis_id" value={tesis.id} />
              <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
              <label htmlFor="tesis-sorumlu" className="sr-only">
                Tesis sorumlusu
              </label>
              <select id="tesis-sorumlu" name="sorumlu_id" defaultValue={tesis.sorumlu_id ?? ''} className={`${GIRDI} min-w-0 flex-1`}>
                <option value="">Atanmamış</option>
                {ekip.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad_soyad}
                  </option>
                ))}
              </select>
              <button className={`${BUTON} border border-[#c9cec6] bg-white`}>Kaydet</button>
            </form>
            <p className="text-xs text-soluk">Bu tesisin tüm yükümlülükleri, ayrıca başka biri seçilmedikçe bu kişinin işlerine düşer.</p>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Görüşmeler</h2>
            <p className={`text-sm ${!sonTemas || gunFarki(sonTemas, gun) > 60 ? 'font-semibold text-turuncu' : 'text-murekkep-2'}`}>
              {sonTemas ? `Son temas ${trTarih(sonTemas)} (${gunFarki(sonTemas, gun)} gün önce)` : 'Kayıtlı temas yok'}
            </p>
            {gorusmeler.slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-start justify-between gap-2 text-sm">
                <span>
                  <span className="font-mono text-xs">{trTarih(g.tarih)}</span> · {KANAL[g.kanal]}
                  {g.kisi_id && kisiAdi.get(g.kisi_id) && ` · ${kisiAdi.get(g.kisi_id)}`}
                  <span className="block text-murekkep-2">{g.ozet}</span>
                </span>
                <form action={gorusmeSil}>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
                  <button aria-label="Görüşmeyi sil" className="text-xs text-soluk hover:text-kirmizi">
                    Sil
                  </button>
                </form>
              </div>
            ))}
            <details>
              <summary className="cursor-pointer text-sm text-yesil">+ Görüşme ekle</summary>
              <form action={gorusmeEkle} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="tesis_id" value={tesis.id} />
                <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
                <div className="flex flex-wrap gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Tarih
                    <input type="date" name="tarih" required defaultValue={gun} className={GIRDI} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Kanal
                    <select name="kanal" className={GIRDI}>
                      {Object.entries(KANAL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  Kiminle
                  <select name="kisi_id" className={GIRDI}>
                    <option value="">—</option>
                    {kisiler.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ad_soyad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Ne konuşuldu
                  <textarea name="ozet" required rows={3} className={`${GIRDI} py-2`} />
                </label>
                <button className={`${BUTON} self-start border border-[#c9cec6] bg-white`}>Kaydet</button>
              </form>
            </details>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">Saha ziyaretleri</h2>
              <Link href={`/saha?tesis=${tesis.id}`} className="text-sm no-underline">
                + Planla
              </Link>
            </div>
            {ziyaretler.slice(0, 4).map((z) => (
              <Link key={z.id} href={`/saha/${z.id}`} className="flex justify-between gap-2 text-sm no-underline">
                <span>{trTarih(z.tarih)}</span>
                <span className="text-soluk">{ZIYARET_DURUMU[z.durum].ad}</span>
              </Link>
            ))}
            {!ziyaretler.length && <p className="text-sm text-soluk">Kayıtlı ziyaret yok.</p>}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">İşletme planı</h2>
              <Link href="/planlar" className="text-sm no-underline">
                Tümü
              </Link>
            </div>
            {planlar
              .filter((p) => p.tesis_idleri.includes(tesis.id))
              .map((p) => (
                <Link key={p.id} href={`/planlar/${p.id}`} className="flex justify-between gap-2 text-sm no-underline">
                  <span className="min-w-0 truncate">{p.onayli_surum ? `Onaylı: ${p.onayli_surum}` : p.baslik}</span>
                  <span className="shrink-0 text-soluk">{PLAN_DURUMU[p.durum].ad}</span>
                </Link>
              ))}
            {!planlar.some((p) => p.tesis_idleri.includes(tesis.id)) && <p className="text-sm text-soluk">Bu tesis için plan kaydı yok.</p>}
          </section>
          <section className="flex flex-col gap-3.5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Tesis yetkilileri</h2>
            {kisiler.map((k) => (
              <div key={k.id} className="flex flex-col gap-0.5 border-b border-cizgi-ince pb-3 last:border-0">
                <span className="text-sm font-semibold">
                  {k.ad_soyad}
                  {k.imza_yetkisi && <span className="ml-2 rounded bg-yesil-acik px-1.5 py-0.5 text-xs font-medium text-yesil-koyu">imza</span>}
                </span>
                {k.gorev && <span className="text-sm text-murekkep-2">{k.gorev}</span>}
                {k.sorumluluklar && <span className="text-xs text-soluk">{k.sorumluluklar}</span>}
                {k.telefon && (
                  <a href={`tel:+90${k.telefon.replace(/^0/, '')}`} className="font-mono text-xs no-underline">
                    {k.telefon}
                  </a>
                )}
                {k.dogum_gunu && (
                  <span className="text-xs text-soluk">
                    Doğum günü: {new Date(`${k.dogum_gunu}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </span>
                )}
                {k.eposta && (
                  <a href={`mailto:${k.eposta}`} className="text-xs no-underline">
                    {k.eposta}
                  </a>
                )}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-soluk">Düzenle</summary>
                  <form action={kisiKaydet} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
                    <KisiAlanlariFormu k={k} />
                    <button className={`${BUTON} self-start bg-yesil font-semibold text-white hover:bg-yesil-koyu`}>Kaydet</button>
                  </form>
                  <form action={kisiSil} className="mt-2">
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
                    <button className="text-xs text-soluk hover:text-kirmizi">Bu kişiyi sil</button>
                  </form>
                </details>
              </div>
            ))}
            {!kisiler.length && <p className="text-sm text-soluk">Kayıtlı kişi yok.</p>}
            <details>
              <summary className="cursor-pointer text-sm text-yesil">+ Yetkili ekle</summary>
              <form action={kisiKaydet} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="tesis_id" value={tesis.id} />
                <input type="hidden" name="gt_kod" value={tesis.gt_kod} />
                <KisiAlanlariFormu />
                <button className={`${BUTON} self-start bg-yesil font-semibold text-white hover:bg-yesil-koyu`}>Ekle</button>
              </form>
            </details>
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Mevzuat</h2>
              {tesis.grup_kod && (
                <Link href={`/mevzuat?sekme=kutuphane&grup=${tesis.grup_kod}`} className="text-sm no-underline">
                  Listele
                </Link>
              )}
            </div>
            <p className="text-sm text-murekkep-2">
              {tesis.grup_kod
                ? `Grup ${tesis.grup_kod}: ${uygulanan.filter((u) => u.uygulama === 'X').length} mevzuat doğrudan, ${uygulanan.filter((u) => u.uygulama === 'K').length} koşullu uygulanıyor.`
                : 'Sektör grubu girilmemiş; uygulanan mevzuat çıkarılamıyor.'}
            </p>
            {etkileyen.map((d) => (
              <Link key={d.id} href={`/mevzuat?acik=${d.id}#d-${d.id}`} className="flex flex-col rounded-lg bg-[#fbf6ee] px-3 py-2 text-sm no-underline">
                <span className="text-xs font-semibold uppercase text-turuncu">Açık değişiklik · {d.tur}</span>
                <span className="text-murekkep">{d.ad}</span>
              </Link>
            ))}
            {tesis.mevzuat_notu && <p className="border-t border-cizgi-ince pt-2 text-sm text-murekkep-2">{tesis.mevzuat_notu}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
