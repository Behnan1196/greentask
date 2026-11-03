import type { Metadata } from 'next';
import Link from 'next/link';
import { RiskEtiketi } from '@/components/rozetler';
import { KURAL_TIPI_ADI, kuralOzeti } from '@/lib/termin/ozet';
import { oturumuDogrula } from '@/lib/veri/depo';
import { isKartiKaydet, turOlustur } from './eylemler';
import { ANA, GIRDI } from './formlar';

export const metadata: Metadata = { title: 'Kılavuz' };

export default async function Kilavuz() {
  const { depo, kullanici } = await oturumuDogrula();
  const yonetici = kullanici.rol === 'yonetici';
  const [turler, kartlar, kayitlar] = await Promise.all([depo.turler({ pasiflerDahil: true }), depo.isKartlari(), depo.yukumlulukler()]);
  const turKarti = new Map(kartlar.filter((k) => k.tur_id).map((k) => [k.tur_id!, k]));
  const genel = kartlar.filter((k) => !k.tur_id);
  const doluMu = (id: string) => {
    const k = turKarti.get(id);
    return !!k && !!(k.yapilacaklar || k.istenecekler || k.nereye || k.dikkat);
  };
  const dolu = turler.filter((t) => t.aktif && doluMu(t.id)).length;
  const aktifTurler = turler.filter((t) => t.aktif).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Kılavuz</h1>
        <p className="max-w-3xl text-sm text-murekkep-2">
          Her yükümlülüğün takvim kuralı ve iş kartı: ne yapılır, kimden ne istenir, nereye hangi formatta verilir, nelere dikkat edilir.
          Yeni başlayan biri işi buradan öğrenir; kartlar tesis kartında ilgili yükümlülüğün altında da görünür.
          İş kartlarını herkes düzenleyebilir, takvim kurallarını yönetici.
        </p>
        <p className="text-sm font-medium">
          {dolu} / {aktifTurler} yükümlülüğün iş kartı dolu
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-cizgi bg-yuzey">
        <h2 className="px-5 py-3.5 text-base font-semibold">Yükümlülük türleri</h2>
        <ul>
          {turler.map((t) => {
            const n = new Set(kayitlar.filter((k) => k.tur_id === t.id && k.durum === 'aktif').map((k) => k.tesis_id)).size;
            return (
              <li key={t.id} className={`border-t border-cizgi-ince ${t.aktif ? '' : 'opacity-60'}`}>
                <Link href={`/kilavuz/${t.kod}`} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 no-underline hover:bg-[#fafbf9]">
                  <span className="min-w-0 flex-[1_1_360px]">
                    <span className="block text-sm font-medium text-murekkep">
                      {t.ad}
                      {!t.aktif && <span className="ml-2 text-xs text-soluk">(kullanılmıyor)</span>}
                    </span>
                    <span className="block text-xs text-soluk">{kuralOzeti(t.kural_tipi, t.parametreler)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-soluk">{n} tesis</span>
                    <RiskEtiketi risk={t.cezai_risk} />
                    <span className={`rounded-md px-2 py-0.5 font-semibold ${doluMu(t.id) ? 'bg-yesil-acik text-yesil-koyu' : 'bg-gri-zemin text-gri'}`}>
                      {doluMu(t.id) ? 'İş kartı var' : 'İş kartı yok'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
        <h2 className="text-base font-semibold">Genel iş kartları · {genel.length}</h2>
        <p className="text-sm text-murekkep-2">Bir yükümlülüğe bağlı olmayan işler: yeni tesis açılışı, saha ziyareti, ÇBS kullanıcı işlemleri, kütle denge hesabı…</p>
        {genel.map((k) => (
          <Link key={k.id} href={`/kilavuz/kart/${k.id}`} className="text-sm no-underline">
            {k.baslik}
          </Link>
        ))}
        <form action={isKartiKaydet} className="flex flex-wrap items-end gap-2 border-t border-cizgi pt-3">
          <label className="flex min-w-0 flex-[1_1_280px] flex-col gap-1 text-sm">
            Yeni genel kart
            <input name="baslik" required placeholder="Örn. Kütle denge hesabı nasıl yapılır" className={GIRDI} />
          </label>
          <button className={ANA}>Oluştur</button>
        </form>
      </section>

      {yonetici && (
        <details className="rounded-xl border border-cizgi bg-yuzey px-5 py-4">
          <summary className="cursor-pointer text-base font-semibold">Yeni yükümlülük türü</summary>
          <p className="mt-2 text-sm text-murekkep-2">
            Örn. ÇBS / GİRGİR yıllık beyanı ve il müdürlüğü onayı, BEK bildirimi. Oluşturduktan sonra takvim kuralını ayarlayıp tesislere yükümlülük olarak eklersiniz.
          </p>
          <form action={turOlustur} className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Ad
              <input name="ad" required placeholder="ÇBS / GİRGİR yıllık beyanı" className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Kısa kod
              <input name="kod" required pattern="[a-z0-9_]{2,40}" placeholder="cbs_beyan" className={`${GIRDI} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Takvim nasıl işler
              <select name="kural_tipi" defaultValue="yillik_sabit_tarih" className={GIRDI}>
                {Object.entries(KURAL_TIPI_ADI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button className={`${ANA} self-end justify-self-start`}>Oluştur</button>
          </form>
        </details>
      )}
    </div>
  );
}
