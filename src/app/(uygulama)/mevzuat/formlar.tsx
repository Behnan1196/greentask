import { gruplariCoz } from '@/lib/mevzuat/etki';
import { bugun } from '@/lib/termin/tarih';
import type { Mevzuat, MevzuatDegisikligi, SektorGrubu } from '@/lib/veri/tipler';

export const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';
export const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
export const TURLER = ['Kanun', 'Yönetmelik', 'Tebliğ', 'Genelge', 'Duyuru', 'Karar', 'Taslak'];

/** G1, G2, …, G10 sırası (metin sıralaması G10'u G1'in arkasına koyar). */
export const grupSirasi = (a: string, b: string) => Number(a.slice(1)) - Number(b.slice(1));

/** Yeni mevzuat değişikliği ve düzenleme formunun alanları. */
export function DegisiklikAlanlari({ gruplar, mevzuatlar, d }: { gruplar: SektorGrubu[]; mevzuatlar: Mevzuat[]; d?: MevzuatDegisikligi }) {
  const secili = new Set(gruplariCoz(d?.etkilenen_gruplar ?? null, gruplar.map((g) => g.kod)));
  return (
    <>
      <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
        Mevzuatın adı
        <input name="ad" required defaultValue={d?.ad} placeholder="Örn. Sıfır Atık Yönetmeliğinde Değişiklik Yapılmasına Dair Yönetmelik" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tür
        <select name="tur" defaultValue={d?.tur ?? 'Yönetmelik'} className={GIRDI}>
          {[...new Set([...TURLER, ...(d?.tur ? [d.tur] : [])])].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Resmî Gazete
        <input name="rg_metin" defaultValue={d?.rg_metin ?? ''} placeholder="gg.aa.yyyy / sayı" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tespit tarihi
        <input type="date" name="tespit_tarihi" defaultValue={d?.tespit_tarihi ?? bugun()} className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Özet
        <textarea name="ozet" rows={3} defaultValue={d?.ozet ?? ''} placeholder="Ne değişti, kimi kapsıyor, yürürlük ve geçiş süreleri" className={`${GIRDI} py-2`} />
      </label>
      <fieldset className="col-span-full flex flex-col gap-1.5 text-sm">
        <legend className="mb-1">Etkilenen sektör grupları</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {gruplar.map((g) => (
            <label key={g.kod} className="flex items-center gap-1.5" title={g.aciklama ?? undefined}>
              <input type="checkbox" name="grup" value={g.kod} defaultChecked={secili.has(g.kod)} className="h-[18px] w-[18px] accent-yesil" />
              <span>
                <span className="font-mono text-xs">{g.kod}</span> {g.ad}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Etkilenen tesisler (ek)
        <input name="etkilenen_tesisler" defaultValue={d?.etkilenen_tesisler ?? ''} placeholder="Gruptan bağımsız tesisler: GT-001, GT-020… ya da “Tüm portföy”" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Yapılacak
        <input name="aksiyon" defaultValue={d?.aksiyon ?? ''} placeholder="Örn. Sera gazı MRV raporu hazırlanması" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Kütüphanedeki mevzuat
        <select name="mevzuat_id" defaultValue={d?.mevzuat_id ?? ''} className={GIRDI}>
          <option value="">— RG sayısından otomatik eşle —</option>
          {mevzuatlar.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ad}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** Kütüphane kaydı (mevzuat) formunun alanları. */
export function MevzuatAlanlari({ m, kategoriler }: { m?: Mevzuat; kategoriler: string[] }) {
  return (
    <>
      <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
        Adı
        <input name="ad" required defaultValue={m?.ad} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kategori
        <input name="kategori" list="mevzuat-kategorileri" defaultValue={m?.kategori ?? ''} className={GIRDI} />
        <datalist id="mevzuat-kategorileri">
          {kategoriler.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tür
        <input name="tur" list="mevzuat-turleri" defaultValue={m?.tur ?? ''} className={GIRDI} />
        <datalist id="mevzuat-turleri">
          {TURLER.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Resmî Gazete
        <input name="rg_metin" defaultValue={m?.rg_metin ?? ''} placeholder="gg.aa.yyyy / sayı" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Kapsam notu
        <textarea name="kapsam_notu" rows={3} defaultValue={m?.kapsam_notu ?? ''} className={`${GIRDI} py-2`} />
      </label>
      <label className="col-span-full flex items-center gap-2 text-sm">
        <input type="checkbox" name="teyit_gerekli" defaultChecked={m?.teyit_gerekli} className="h-[18px] w-[18px] accent-yesil" />
        Güncel hâli Resmî Gazete’den teyit edilmeli (her yıl yenilenen tebliğ, tarife vb.)
      </label>
    </>
  );
}
