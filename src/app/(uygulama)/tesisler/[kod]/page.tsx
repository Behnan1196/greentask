import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DurumRozeti, KalanGun, RiskEtiketi } from '@/components/rozetler';
import type { KuralTipi } from '@/lib/termin/motor';
import { bugun, trTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { terminleriHesapla, type TerminSatiri } from '@/lib/veri/terminler';
import type { Kullanici } from '@/lib/veri/tipler';
import { olayEkle, olaySil, tesisSorumlusuKaydet, yukumlulukKaydet } from './eylemler';

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

function YukumlulukSatiri({ s, gtKod, ekip }: { s: TerminSatiri; gtKod: string; ekip: Kullanici[] }) {
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

  const [turler, kayitlar, kisiler, ekip] = await Promise.all([
    depo.turler(),
    depo.yukumlulukler(tesis.id),
    depo.kisiler(tesis.id),
    depo.kullanicilar(),
  ]);
  const olaylar = await depo.olaylar(kayitlar.map((k) => k.id));
  const terminler = terminleriHesapla(kayitlar, turler, [tesis], olaylar, bugun());
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
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Yükümlülükler" className="min-w-0 flex-[999_1_640px] overflow-hidden rounded-xl border border-cizgi bg-yuzey">
          <div className="flex items-baseline justify-between px-5 py-4">
            <h2 className="text-base font-semibold">Yükümlülükler · {takipte.length}</h2>
            <span className="text-xs text-soluk">Satıra tıklayınca tarihleri ve geçmişi düzenleyebilirsiniz</span>
          </div>
          {takipte.map((s) => (
            <YukumlulukSatiri key={s.kayit.id} s={s} gtKod={tesis.gt_kod} ekip={ekip} />
          ))}
          {disarida.length > 0 && (
            <>
              <h2 className="border-t border-cizgi px-5 pb-1 pt-4 text-sm font-semibold text-soluk">Muaf / kapsam dışı · {disarida.length}</h2>
              {disarida.map((s) => (
                <YukumlulukSatiri key={s.kayit.id} s={s} gtKod={tesis.gt_kod} ekip={ekip} />
              ))}
            </>
          )}
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
          <section className="flex flex-col gap-3.5 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Tesis yetkilileri</h2>
            {kisiler.map((k) => (
              <div key={k.id} className="flex flex-col gap-0.5">
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
              </div>
            ))}
            {!kisiler.length && <p className="text-sm text-soluk">Kayıtlı kişi yok.</p>}
          </section>
          {tesis.mevzuat_notu && (
            <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Mevzuat notu</h2>
              <p className="text-sm text-murekkep-2">{tesis.mevzuat_notu}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
