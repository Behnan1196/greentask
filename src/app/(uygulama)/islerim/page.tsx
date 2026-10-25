import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { DurumRozeti, KalanGun } from '@/components/rozetler';
import type { TerminDurumu } from '@/lib/termin/motor';
import { bugun, gunFarki, trTarih, trUzunTarih } from '@/lib/termin/tarih';
import { oturumuDogrula } from '@/lib/veri/depo';
import { sorumlusu, terminleriHesapla, type TerminSatiri } from '@/lib/veri/terminler';
import { gorevDurumu, gorevEkle, takvimAnahtariniYenile } from './eylemler';
import { KopyalaKutusu } from './kopyala';

export const metadata: Metadata = { title: 'Benim İşlerim' };

const GRUPLAR: { baslik: string; durumlar: TerminDurumu[]; acik: boolean }[] = [
  { baslik: 'Gecikmiş', durumlar: ['gecikti'], acik: true },
  { baslik: '30 gün içinde', durumlar: ['acil'], acik: true },
  { baslik: '31–90 gün', durumlar: ['yaklasiyor'], acik: true },
  { baslik: 'Süreçte', durumlar: ['surecte'], acik: false },
  { baslik: 'Planlı (90 günden uzak)', durumlar: ['planli'], acik: false },
  { baslik: 'Veri eksik', durumlar: ['veri_eksik'], acik: false },
];

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm';

function TerminKarti({ s }: { s: TerminSatiri }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-cizgi-ince px-5 py-3">
      <div className="min-w-0 flex-1">
        {s.tesis ? (
          <Link href={`/tesisler/${s.tesis.gt_kod}`} className="text-sm font-medium no-underline">
            <span className="font-mono text-xs text-soluk">{s.tesis.gt_kod}</span> {s.tesis.kisa_ad}
          </Link>
        ) : (
          <span className="text-sm font-medium">{s.kayit.etiket}</span>
        )}
        <p className="text-sm">
          {s.tur.ad}
          {s.kayit.etiket && s.tesis && <span className="text-soluk"> · {s.kayit.etiket}</span>}
        </p>
        <p className="text-xs text-soluk">
          {s.sonuc.aksiyonAdi
            ? `${s.sonuc.aksiyonAdi}: ${trTarih(s.sonuc.aksiyonTarihi)} · son gün ${trTarih(s.sonuc.sonTarih)}`
            : s.sonuc.aciklama}
        </p>
      </div>
      {s.sonuc.kalanGunAksiyon != null ? <KalanGun sonuc={s.sonuc} /> : <DurumRozeti durum={s.sonuc.durum} />}
    </li>
  );
}

export default async function BenimIslerim() {
  const { depo, kullanici } = await oturumuDogrula();
  const gun = bugun();
  const [tesisler, turler, kayitlar, olaylar, gorevler, ekip, anahtar, ziyaretler] = await Promise.all([
    depo.tesisler(),
    depo.turler(),
    depo.yukumlulukler(),
    depo.olaylar(),
    depo.gorevler({ sorumluId: kullanici.id, acik: true }),
    depo.kullanicilar(),
    depo.takvimAnahtari(),
    depo.ziyaretler(),
  ]);
  const ziyaretlerim = ziyaretler
    .filter((z) => z.ziyaretci_id === kullanici.id && (z.durum === 'planli' || z.durum === 'yapildi'))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));
  const hepsi = terminleriHesapla(kayitlar, turler, tesisler, olaylar, gun);
  const benim = hepsi.filter((s) => sorumlusu(s) === kullanici.id);
  const atanmamis = hepsi.filter((s) => !sorumlusu(s) && ['gecikti', 'acil', 'yaklasiyor'].includes(s.sonuc.durum)).length;
  const tesisSayisi = tesisler.filter((t) => t.sorumlu_id === kullanici.id).length;

  const h = await headers();
  const kok = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const takvimUrl = `${kok}/takvim/${anahtar}.ics`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <span className="text-sm text-soluk">{trUzunTarih(gun)}</span>
        <h1 className="text-3xl font-semibold tracking-tight">Benim İşlerim</h1>
        <span className="text-sm text-murekkep-2">
          {kullanici.ad_soyad} · {tesisSayisi} tesisin sorumlusu · {benim.length} yükümlülük · {gorevler.length} açık görev
        </span>
      </header>

      {!benim.length && (
        <div className="rounded-xl border border-dashed border-[#a9afa6] bg-yuzey px-5 py-4 text-sm text-murekkep-2">
          Henüz size atanmış bir tesis ya da yükümlülük yok. Tesis kartında sağdaki “Greentask sorumlusu” alanından atama yapılır.
          {atanmamis > 0 && (
            <>
              {' '}
              Şu an <Link href="/?kim=atanmamis">{atanmamis} öncelikli termin</Link> kimseye atanmamış.
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Terminlerim" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          {GRUPLAR.map((g) => {
            const liste = benim.filter((s) => g.durumlar.includes(s.sonuc.durum));
            if (!liste.length) return null;
            return (
              <details key={g.baslik} open={g.acik} className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
                <summary className="flex cursor-pointer items-baseline justify-between px-5 py-3.5">
                  <h2 className="text-base font-semibold">{g.baslik}</h2>
                  <span className="font-mono text-sm text-soluk">{liste.length}</span>
                </summary>
                <ul>
                  {liste.map((s) => (
                    <TerminKarti key={s.kayit.id} s={s} />
                  ))}
                </ul>
              </details>
            );
          })}
        </section>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {ziyaretlerim.length > 0 && (
            <section className="flex flex-col gap-2 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
              <h2 className="text-base font-semibold">Saha ziyaretlerim · {ziyaretlerim.length}</h2>
              {ziyaretlerim.map((z) => {
                const t = tesisler.find((x) => x.id === z.tesis_id);
                return (
                  <Link key={z.id} href={`/saha/${z.id}`} className="flex justify-between gap-2 text-sm no-underline">
                    <span>
                      <span className="font-mono text-xs text-soluk">{trTarih(z.tarih)}</span> {t?.kisa_ad}
                    </span>
                    <span className="text-xs text-soluk">{z.durum === 'yapildi' ? 'rapor bekliyor' : z.amac}</span>
                  </Link>
                );
              })}
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Görevlerim · {gorevler.length}</h2>
            {gorevler.length ? (
              <ul className="flex flex-col">
                {gorevler.map((g) => {
                  const kalan = g.son_tarih ? gunFarki(gun, g.son_tarih) : null;
                  const tesis = tesisler.find((t) => t.id === g.tesis_id);
                  return (
                    <li key={g.id} className="flex items-start gap-3 border-t border-cizgi-ince py-2.5 first:border-t-0">
                      <form action={gorevDurumu}>
                        <input type="hidden" name="id" value={g.id} />
                        <input type="hidden" name="durum" value="tamamlandi" />
                        <button
                          aria-label={`“${g.baslik}” görevini tamamla`}
                          className="mt-0.5 h-5 w-5 rounded border border-[#a9afa6] bg-white hover:border-yesil hover:bg-yesil-acik"
                        />
                      </form>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{g.baslik}</p>
                        <p className={`text-xs ${kalan != null && kalan < 0 ? 'font-semibold text-kirmizi' : 'text-soluk'}`}>
                          {g.son_tarih ? `${trTarih(g.son_tarih)}${kalan != null && kalan < 0 ? ` · ${-kalan} gün geçti` : ''}` : 'Tarihsiz'}
                          {tesis && ` · ${tesis.gt_kod} ${tesis.kisa_ad}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-soluk">Açık görev yok.</p>
            )}
            <form action={gorevEkle} className="flex flex-col gap-2 border-t border-cizgi pt-3">
              <label className="flex flex-col gap-1 text-sm">
                Yeni görev
                <input name="baslik" required placeholder="Örn. Oretec'ten poliçeyi iste" className={GIRDI} />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  Son tarih
                  <input type="date" name="son_tarih" className={GIRDI} />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  Kime
                  <select name="sorumlu_id" defaultValue={kullanici.id} className={GIRDI}>
                    {ekip.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.id === kullanici.id ? `${k.ad_soyad} (ben)` : k.ad_soyad}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
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
              <button className="min-h-10 self-start rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu">Ekle</button>
            </form>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
            <h2 className="text-base font-semibold">Takvim aboneliği</h2>
            <p className="text-sm text-murekkep-2">
              Terminleriniz ve görevleriniz Outlook, Google Takvim ya da telefonunuzun takviminde görünsün. Takvim birkaç saatte bir kendini günceller.
            </p>
            <KopyalaKutusu deger={takvimUrl} etiket="Takvim abonelik adresi" />
            <a href={takvimUrl.replace(/^https?:/, 'webcal:')} className="text-sm">
              Bu cihazın takviminde aç →
            </a>
            <details className="text-xs text-soluk">
              <summary className="cursor-pointer">Nasıl eklenir?</summary>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
                <li>Google Takvim: Diğer takvimler → + → URL ile → adresi yapıştırın.</li>
                <li>Outlook: Takvim ekle → Web’den abone ol → adresi yapıştırın.</li>
                <li>iPhone: yukarıdaki “Bu cihazın takviminde aç” bağlantısına dokunun.</li>
              </ul>
            </details>
            <form action={takvimAnahtariniYenile} className="border-t border-cizgi pt-3">
              <p className="mb-2 text-xs text-soluk">Bu adres kişiye özeldir; paylaşmayın. Başkasının eline geçtiyse yenileyin (eski adres çalışmaz olur).</p>
              <button className="min-h-9 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm">Adresi yenile</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
