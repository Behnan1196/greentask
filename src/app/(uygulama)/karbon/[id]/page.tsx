import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GHGP_KATEGORI_ADI, ISO_KATEGORI_ADI, type IsoKategori } from '@/lib/karbon/adlar';
import { DEFRA, GRUP_ADI, defraAdi, defraBirimi } from '@/lib/karbon/defra';
import { ayarlariAl, satirdanFaaliyet } from '@/lib/karbon/form';
import { KAYNAKLAR } from '@/lib/karbon/kaynaklar';
import { hesapla, type Faaliyet, type Sonuc } from '@/lib/karbon/motor';
import { SINIR_ADI, TUR_ADI, VERI_KALITESI_ADI, pay, ton, yuzde } from '@/lib/karbon/sunum';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { KarbonFaaliyetSatiri } from '@/lib/veri/tipler';
import { envanterAyarla, envanterKilidiAc, envanterKilitle, envanterSil, faaliyetKaydet, faaliyetSil } from '../eylemler';
import { FaaliyetFormu, type DefraSecenegi } from '../faaliyet-formu';

export const metadata: Metadata = { title: 'Karbon Envanteri' };

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';
const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
const BUTON = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-4 text-sm font-medium hover:bg-zemin';
const KUTU = 'rounded-xl border border-cizgi bg-yuzey px-5 py-4';
const TURLER: Faaliyet['tur'][] = ['sabit_yanma', 'mobil_yanma', 'kacak', 'elektrik', 'defra', 'ozel'];
const ISLEM_ADI: Record<string, string> = {
  faaliyet_ekle: 'Faaliyet eklendi',
  faaliyet_guncelle: 'Faaliyet değişti',
  faaliyet_sil: 'Faaliyet silindi',
  kilitle: 'Envanter kilitlendi',
  kilit_ac: 'Kilit açıldı',
  ayar: 'Envanter bilgileri değişti',
};

export default async function EnvanterSayfasi(props: PageProps<'/karbon/[id]'>) {
  const { depo, kullanici } = await oturumuDogrula();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const env = await depo.envanter(id);
  if (!env) notFound();
  const [faaliyetler, tesisler, ekip, iz] = await Promise.all([depo.faaliyetler(id), depo.tesisler({ pasiflerDahil: true }), depo.kullanicilar(), depo.denetimIzi(id)]);
  const kilitli = env.durum === 'kilitli';
  const tesis = tesisler.find((t) => t.id === env.tesis_id);
  const adi = new Map(ekip.map((k) => [k.id, k.ad_soyad]));

  let sonuc: Sonuc | null = null;
  let hesapHatasi: string | null = null;
  try {
    sonuc = kilitli && env.kilit_sonucu ? (env.kilit_sonucu as Sonuc) : hesapla(faaliyetler.map(satirdanFaaliyet), ayarlariAl(env));
  } catch (e) {
    hesapHatasi = e instanceof Error ? e.message : String(e);
  }
  const satirKaydi = new Map<string, KarbonFaaliyetSatiri>(faaliyetler.map((f) => [f.id, f]));
  const secilenTur = (TURLER.includes(sp.tur as Faaliyet['tur']) ? sp.tur : 'sabit_yanma') as Faaliyet['tur'];
  const hata = typeof sp.hata === 'string' ? sp.hata : null;
  const defra = {
    gruplar: Object.entries(GRUP_ADI).filter(([g]) => DEFRA.faktorler.some((f) => f.grup === g)),
    secenekler: DEFRA.faktorler.map((f): DefraSecenegi => ({ id: f.id, grup: f.grup, ad: defraAdi(f), birim: defraBirimi(f), deger: f.kgco2e })),
  };
  const kapsam3Kategorileri = new Set(sonuc?.satirlar.filter((s) => s.kapsam === 3).map((s) => s.ghgp_kategori) ?? []);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href="/karbon" className="text-sm">
          ← Karbon envanterleri
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{env.baslik}</h1>
            <p className="text-sm text-murekkep-2">
              {tesis ? `${tesis.gt_kod} · ${tesis.resmi_unvan ?? tesis.kisa_ad}` : '—'} · {env.yil} · {SINIR_ADI[env.sinir_yaklasimi]} · KÜP {env.gwp}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${kilitli ? 'bg-yesil-acik text-yesil-koyu' : 'bg-turuncu-zemin text-turuncu'}`}>
              {kilitli ? `Kilitli · ${new Date(env.kilit_zamani!).toLocaleDateString('tr-TR')}` : 'Taslak'}
            </span>
            <a href={`/karbon-rapor/${id}`} className={`${BUTON} inline-flex items-center no-underline`}>
              Rapor
            </a>
            <a href={`/api/karbon/${id}/csv`} className={`${BUTON} inline-flex items-center no-underline`}>
              Excel (CSV)
            </a>
            {!kilitli ? (
              <form action={envanterKilitle}>
                <input type="hidden" name="id" value={id} />
                <button className={ANA} disabled={!!hesapHatasi || !faaliyetler.length}>
                  Kilitle
                </button>
              </form>
            ) : (
              kullanici.rol === 'yonetici' && (
                <form action={envanterKilidiAc}>
                  <input type="hidden" name="id" value={id} />
                  <button className={BUTON}>Kilidi aç</button>
                </form>
              )
            )}
          </div>
        </div>
      </header>

      {hata && <p className="rounded-lg bg-kirmizi-zemin px-4 py-3 text-sm text-kirmizi">Kaydedilmedi: {hata}</p>}
      {hesapHatasi && <p className="rounded-lg bg-kirmizi-zemin px-4 py-3 text-sm text-kirmizi">Hesaplanamadı: {hesapHatasi}</p>}

      {sonuc && (
        <section className={`${KUTU} flex flex-col gap-4`}>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-soluk">Toplam</p>
              <p className="font-mono text-3xl font-semibold">
                {ton(sonuc.toplam)} <span className="text-base font-normal">t CO₂e</span>
              </p>
              <p className="text-xs text-soluk">belirsizlik {yuzde(sonuc.belirsizlik.toplam)} (%95)</p>
            </div>
            {([1, 2, 3] as const).map((k) => (
              <div key={k}>
                <p className="text-xs text-soluk">Kapsam {k}</p>
                <p className="font-mono text-xl">{ton(sonuc!.kapsam[k])}</p>
                <p className="text-xs text-soluk">{pay(sonuc!.kapsam[k], sonuc!.toplam)}</p>
              </div>
            ))}
            {sonuc.kapsam2_piyasa !== sonuc.kapsam[2] && (
              <div>
                <p className="text-xs text-soluk">Kapsam 2 · piyasa esaslı</p>
                <p className="font-mono text-xl">{ton(sonuc.kapsam2_piyasa)}</p>
              </div>
            )}
            {sonuc.biyojenik_co2 > 0 && (
              <div>
                <p className="text-xs text-soluk">Biyojenik CO₂ (toplam dışı)</p>
                <p className="font-mono text-xl">{ton(sonuc.biyojenik_co2)}</p>
              </div>
            )}
          </div>
          <table className="w-full max-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-cizgi text-left text-xs text-soluk">
                <th className="py-1.5 font-medium">ISO 14064-1 kategorisi</th>
                <th className="py-1.5 text-right font-medium">t CO₂e</th>
                <th className="py-1.5 text-right font-medium">Pay</th>
                <th className="py-1.5 text-right font-medium">Belirsizlik</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ISO_KATEGORI_ADI) as IsoKategori[]).map((k) => (
                <tr key={k} className="border-b border-cizgi-ince">
                  <td className="py-1.5">{ISO_KATEGORI_ADI[k]}</td>
                  <td className="py-1.5 text-right font-mono">{ton(sonuc!.kategori[k])}</td>
                  <td className="py-1.5 text-right">{pay(sonuc!.kategori[k], sonuc!.toplam)}</td>
                  <td className="py-1.5 text-right text-soluk">{sonuc!.kategori[k] ? yuzde(sonuc!.belirsizlik.kategori[k]) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary className="cursor-pointer text-sm font-medium">GHG Protocol Kapsam 3 kategorileri · {kapsam3Kategorileri.size} / 15 kapsandı</summary>
            <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-1 text-sm">
              {Object.entries(GHGP_KATEGORI_ADI).map(([k, ad]) => (
                <li key={k} className={kapsam3Kategorileri.has(Number(k)) ? 'text-yesil-koyu' : 'text-soluk'}>
                  {kapsam3Kategorileri.has(Number(k)) ? '✓' : '·'} {k}. {ad}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-soluk">Kapsanmayan kategoriler raporda “hariç tutulanlar” bölümünde gerekçesiyle yer almalı.</p>
          </details>
          {sonuc.uyarilar.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-turuncu">
              {[...new Set(sonuc.uyarilar)].map((u) => (
                <li key={u}>⚠ {u}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section id="faaliyetler" className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <h2 className="px-5 py-3.5 text-base font-semibold">Faaliyet verileri · {faaliyetler.length}</h2>
        {sonuc &&
          (Object.keys(ISO_KATEGORI_ADI) as IsoKategori[]).map((k) => {
            const satirlar = sonuc!.satirlar.filter((s) => s.iso_kategori === k);
            if (!satirlar.length) return null;
            return (
              <div key={k} className="border-t border-cizgi">
                <h3 className="bg-[#f7f8f5] px-5 py-2 text-xs font-semibold text-murekkep-2">
                  {ISO_KATEGORI_ADI[k]} · {ton(sonuc!.kategori[k])} t
                </h3>
                <ul>
                  {satirlar.map((s) => {
                    const kayit = satirKaydi.get(s.kaynak_id);
                    const v = kayit?.veri as Record<string, unknown> | undefined;
                    return (
                      <li key={s.id} className="border-t border-cizgi-ince">
                        <details className="px-5 py-2.5">
                          <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-3">
                            <span className="min-w-0 flex-[1_1_300px] text-sm">
                              <span className="font-medium">{(s.tur !== 'wtt' && (v?.aciklama as string)) || s.baslik}</span>
                              <span className="block text-xs text-soluk">
                                {[s.tur !== 'wtt' && (v?.aciklama as string) ? s.baslik : null, s.ghgp_kategori && `GHGP ${s.ghgp_kategori}`, s.tur === 'wtt' ? 'otomatik' : null, v?.tesis as string]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                            <span className="font-mono text-sm">
                              {ton(s.co2e, 3)} t <span className="text-xs text-soluk">{yuzde(s.belirsizlik, 0)}</span>
                            </span>
                          </summary>
                          <div className="mt-2 flex flex-col gap-2 text-sm">
                            <ol className="list-decimal pl-5 font-mono text-xs leading-6 text-murekkep-2">
                              {s.izler.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ol>
                            <p className="text-xs text-soluk">Kaynak: {s.kaynaklar.map((c) => KAYNAKLAR[c].ad.split(' — ')[0].split(',')[0]).join(' · ')}</p>
                            {kayit && (
                              <p className="text-xs text-soluk">
                                Veri kalitesi: {VERI_KALITESI_ADI[kayit.veri.veri_kalitesi]} · Kanıt: {kayit.kanit ?? '—'}
                              </p>
                            )}
                            {kayit && s.tur !== 'wtt' && !kilitli && (
                              <div className="flex flex-col gap-3 rounded-lg bg-[#f7f8f5] p-3">
                                <FaaliyetFormu
                                  eylem={faaliyetKaydet}
                                  envanterId={id}
                                  tur={kayit.veri.tur}
                                  faaliyetId={kayit.id}
                                  d={kayit.veri}
                                  kanit={kayit.kanit}
                                  defra={kayit.veri.tur === 'defra' ? defra : undefined}
                                />
                                <form action={faaliyetSil}>
                                  <input type="hidden" name="faaliyet_id" value={kayit.id} />
                                  <button className="text-sm text-kirmizi underline">Bu satırı sil</button>
                                </form>
                              </div>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        {!faaliyetler.length && <p className="border-t border-cizgi-ince px-5 py-4 text-sm text-soluk">Henüz faaliyet verisi yok.</p>}
      </section>

      {!kilitli && (
        <section id="ekle" className={`${KUTU} flex flex-col gap-3`}>
          <h2 className="text-base font-semibold">Faaliyet verisi ekle</h2>
          <nav className="flex flex-wrap gap-1.5">
            {TURLER.map((t) => (
              <Link
                key={t}
                href={`/karbon/${id}?tur=${t}#ekle`}
                scroll={false}
                className={`rounded-md px-3 py-1.5 text-sm no-underline ${t === secilenTur ? 'bg-yesil-acik font-semibold text-yesil-koyu' : 'border border-cizgi text-murekkep'}`}
              >
                {TUR_ADI[t]}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-soluk">{ACIKLAMA[secilenTur]}</p>
          <FaaliyetFormu key={secilenTur} eylem={faaliyetKaydet} envanterId={id} tur={secilenTur} defra={secilenTur === 'defra' ? defra : undefined} />
        </section>
      )}

      <details className={KUTU}>
        <summary className="cursor-pointer text-base font-semibold">Envanter bilgileri ve sınırlar</summary>
        <form action={envanterAyarla} className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="tesis_id" value={env.tesis_id} />
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Başlık
            <input name="baslik" defaultValue={env.baslik} disabled={kilitli} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Raporlama yılı
            <input name="yil" type="number" defaultValue={env.yil} disabled={kilitli} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Baz yıl
            <input name="baz_yil" type="number" defaultValue={env.baz_yil ?? ''} placeholder={String(env.yil)} disabled={kilitli} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sınır yaklaşımı
            <select name="sinir_yaklasimi" defaultValue={env.sinir_yaklasimi} disabled={kilitli} className={GIRDI}>
              {Object.entries(SINIR_ADI).map(([k, ad]) => (
                <option key={k} value={k}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            KÜP seti
            <select name="gwp" defaultValue={env.gwp} disabled={kilitli} className={GIRDI}>
              <option value="AR5">IPCC AR5</option>
              <option value="AR6">IPCC AR6</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Hazırlayan
            <select name="hazirlayan_id" defaultValue={env.hazirlayan_id ?? ''} disabled={kilitli} className={GIRDI}>
              <option value="">—</option>
              {ekip.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad_soyad}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-full flex items-center gap-2 text-sm">
            <input type="checkbox" name="yakit_wtt" value="1" defaultChecked={env.yakit_wtt} disabled={kilitli} className="h-[18px] w-[18px] accent-yesil" />
            Yakıtların tedarik zinciri emisyonlarını (WTT) Kategori 4’e otomatik ekle
          </label>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Kuruluş ve raporlama sınırı
            <textarea name="sinir_aciklamasi" rows={3} defaultValue={env.sinir_aciklamasi ?? ''} disabled={kilitli} placeholder="Dahil edilen tesisler, binalar, araç filosu; önemli dolaylı emisyonları belirleme ölçütü" className={`${GIRDI} py-2`} />
          </label>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Hariç tutulanlar ve gerekçesi
            <textarea name="haric_tutulanlar" rows={3} defaultValue={env.haric_tutulanlar ?? ''} disabled={kilitli} placeholder="ör. Kategori 5: ürün kullanımı — veri yok, toplam içindeki payı önemsiz kabul edildi" className={`${GIRDI} py-2`} />
          </label>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            Notlar
            <textarea name="notlar" rows={2} defaultValue={env.notlar ?? ''} disabled={kilitli} className={`${GIRDI} py-2`} />
          </label>
          {!kilitli && <button className={`${ANA} justify-self-start`}>Kaydet</button>}
        </form>
      </details>

      <details className={KUTU}>
        <summary className="cursor-pointer text-base font-semibold">Denetim izi · {iz.length}</summary>
        <ul className="mt-3 flex flex-col text-sm">
          {iz.map((k) => (
            <li key={k.id} className="flex flex-wrap gap-x-3 border-b border-cizgi-ince py-1.5">
              <span className="w-36 shrink-0 font-mono text-xs text-soluk">{new Date(k.zaman).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="w-40 shrink-0">{ISLEM_ADI[k.islem] ?? k.islem}</span>
              <span className="min-w-0 flex-1 text-xs text-murekkep-2">{izOzeti(k.onceki, k.sonraki)}</span>
              <span className="text-xs text-soluk">{adi.get(k.kullanici_id ?? '') ?? ''}</span>
            </li>
          ))}
        </ul>
      </details>

      {!kilitli && (
        <form action={envanterSil} className="self-start">
          <input type="hidden" name="id" value={id} />
          <button className="text-sm text-kirmizi underline">Envanteri sil</button>
        </form>
      )}
    </div>
  );
}

const ACIKLAMA: Record<Faaliyet['tur'], string> = {
  sabit_yanma: 'Kazan, fırın, jeneratör, ısıtma. Doğal gazı faturadaki kWh ile girin; Sm³ ile girerseniz faturadaki üst ısıl değer gerekir.',
  mobil_yanma: 'Şirkete ait ya da şirketin kontrolündeki araçların yakıtı (taşıt tanıma, akaryakıt faturaları). Kiralık / taşeron araçlar Kategori 3’tedir.',
  kacak: 'Klima, soğutma ve söndürme sistemlerine yıl içinde eklenen gaz miktarı (servis formları); eklenen miktar kaçak kabul edilir.',
  elektrik: 'Şebekeden alınan elektrik. YEK-G belgeli yenilenebilir alım varsa piyasa esaslı Kapsam 2 ayrıca hesaplanır.',
  defra: 'Nakliye, iş seyahati, personel ulaşımı, satın alınan malzemeler, atık ve su. DEFRA 2026 faktörleri (İngilizce adlarıyla).',
  ozel: 'Tedarikçiye özgü faktör (EPD, ürün karbon ayak izi), proses emisyonu ya da kütüphanede bulunmayan her kalem. Kaynağı yazılmalı.',
};

function izOzeti(onceki: Record<string, unknown> | null, sonraki: Record<string, unknown> | null) {
  const v = (sonraki?.veri ?? onceki?.veri) as Record<string, unknown> | undefined;
  if (v) {
    const ad = (v.aciklama as string) || TUR_ADI[v.tur as Faaliyet['tur']] || '';
    const m = v.miktar ?? v.miktar_kg ?? v.miktar_mwh;
    const eski = (onceki?.veri as Record<string, unknown> | undefined)?.miktar;
    return `${ad}${m != null ? ` · ${m}${eski != null && sonraki && eski !== v.miktar ? ` (önce ${eski})` : ''}` : ''}`;
  }
  if (onceki && sonraki) {
    const degisen = Object.keys(sonraki).filter((k) => JSON.stringify(sonraki[k]) !== JSON.stringify(onceki[k]) && !['kilit_zamani', 'kilitleyen'].includes(k));
    return degisen.join(', ');
  }
  return '';
}
