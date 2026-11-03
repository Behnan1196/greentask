import type { Metadata } from 'next';
import { oturumuDogrula } from '@/lib/veri/depo';
import { grupKaydet, profilKaydet } from './eylemler';

export const metadata: Metadata = { title: 'Ayarlar' };

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal disabled:bg-[#f4f5f2]';
const KAYDET = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm';

export default async function Ayarlar() {
  const { depo, kullanici } = await oturumuDogrula();
  const yonetici = kullanici.rol === 'yonetici';
  const [profiller, gruplar, tesisler] = await Promise.all([depo.profiller(), depo.sektorGruplari(), depo.tesisler()]);
  gruplar.sort((a, b) => Number(a.kod.slice(1)) - Number(b.kod.slice(1)));
  const sonraki = `G${Math.max(0, ...gruplar.map((g) => Number(g.kod.slice(1)))) + 1}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Ayarlar</h1>
        {!yonetici && <p className="text-sm text-murekkep-2">Bu sayfadaki değişiklikleri yönetici yapar; siz yalnızca görüntüleyebilirsiniz.</p>}
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
        <h2 className="text-base font-semibold">Ekip · {profiller.filter((p) => p.aktif).length} aktif</h2>
        <p className="text-sm text-murekkep-2">
          Yeni çalışan Supabase panelinden davet edilir (Authentication → Users → Invite user). Davet kabul edilince burada “Mühendis” olarak görünür;
          adını buradan girin. Ayrılan çalışanı silmek yerine “Aktif” işaretini kaldırın: giriş yapamaz, eski kayıtlarda adı görünmeye devam eder.
        </p>
        <div className="flex flex-col">
          {profiller.map((p) => (
            <form key={p.id} action={profilKaydet} className={`flex flex-wrap items-end gap-3 border-t border-cizgi-ince py-3 ${p.aktif ? '' : 'opacity-60'}`}>
              <input type="hidden" name="id" value={p.id} />
              <label className="flex min-w-0 flex-[2_1_200px] flex-col gap-1 text-sm">
                Ad soyad
                <input name="ad_soyad" defaultValue={p.ad_soyad} disabled={!yonetici} className={GIRDI} />
              </label>
              <span className="flex min-w-0 flex-[2_1_200px] flex-col gap-1 text-sm">
                E-posta
                <span className="min-h-10 truncate py-2 text-murekkep-2">{p.eposta}</span>
              </span>
              <label className="flex flex-[1_1_140px] flex-col gap-1 text-sm">
                Rol
                <select name="rol" defaultValue={p.rol} disabled={!yonetici} className={GIRDI}>
                  <option value="muhendis">Mühendis</option>
                  <option value="yonetici">Yönetici</option>
                </select>
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" name="aktif" defaultChecked={p.aktif} disabled={!yonetici} className="h-[18px] w-[18px] accent-yesil" />
                Aktif
              </label>
              {yonetici && <button className={KAYDET}>Kaydet</button>}
              {p.id === kullanici.id && <span className="text-xs text-soluk">siz</span>}
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-cizgi bg-yuzey px-5 py-4">
        <h2 className="text-base font-semibold">Sektör grupları</h2>
        <p className="text-sm text-murekkep-2">
          Mevzuat matrisi ve yeni tesiste önerilen yükümlülükler bu gruplara göre çalışır. Tesisin grubunu tesis kartından değiştirirsiniz.
        </p>
        {[...gruplar, ...(yonetici ? [{ kod: '', ad: '', aciklama: null }] : [])].map((g) => (
          <form key={g.kod || 'yeni'} action={grupKaydet} className="flex flex-wrap items-end gap-3 border-t border-cizgi-ince py-3">
            <label className="flex w-24 flex-col gap-1 text-sm">
              Kod
              {g.kod ? (
                <>
                  <input type="hidden" name="kod" value={g.kod} />
                  <span className="min-h-10 py-2 font-mono">{g.kod}</span>
                </>
              ) : (
                <input name="kod" required defaultValue={sonraki} className={`${GIRDI} font-mono`} />
              )}
            </label>
            <label className="flex min-w-0 flex-[2_1_220px] flex-col gap-1 text-sm">
              {g.kod ? 'Ad' : 'Yeni grup adı'}
              <input name="ad" required defaultValue={g.ad} disabled={!yonetici} className={GIRDI} />
            </label>
            <label className="flex min-w-0 flex-[3_1_280px] flex-col gap-1 text-sm">
              Açıklama
              <input name="aciklama" defaultValue={g.aciklama ?? ''} disabled={!yonetici} className={GIRDI} />
            </label>
            {g.kod && <span className="min-h-10 py-2 text-xs text-soluk">{tesisler.filter((t) => t.grup_kod === g.kod).length} tesis</span>}
            {yonetici && <button className={KAYDET}>{g.kod ? 'Kaydet' : 'Ekle'}</button>}
          </form>
        ))}
      </section>
    </div>
  );
}
