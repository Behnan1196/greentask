import type { Kisi, SektorGrubu, Tesis } from '@/lib/veri/tipler';

export const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';
export const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';
export const SINIFLAR = ['EK-1', 'EK-1*', 'Ek-2', 'Kapsamdışı'];
export const grupSirasi = (a: SektorGrubu, b: SektorGrubu) => Number(a.kod.slice(1)) - Number(b.kod.slice(1));

/**
 * Tesis bilgileri (yeni tesis ve düzenleme için ortak). Sektör grubu ayrı verilir: yeni tesis formunda
 * grup seçimi yükümlülük önerilerini de değiştirdiği için istemci bileşeninde.
 */
export function TesisAlanlariFormu({ t, gruplar, grupAlaniGoster = true }: { t?: Tesis; gruplar: SektorGrubu[]; grupAlaniGoster?: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Kısa ad
        <input name="kisa_ad" required defaultValue={t?.kisa_ad} placeholder="Örn. Samsun Avdan-Samsun" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Resmî unvan
        <input name="resmi_unvan" defaultValue={t?.resmi_unvan ?? ''} placeholder="Ticaret sicilindeki tam unvan (işletme planı taraması bunu kullanır)" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        İl
        <input name="il" defaultValue={t?.il ?? ''} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sınıf
        <input name="sinif" list="tesis-siniflari" defaultValue={t?.sinif ?? ''} placeholder="EK-1 / Ek-2 / Kapsamdışı" className={GIRDI} />
        <datalist id="tesis-siniflari">
          {SINIFLAR.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        NACE kodları
        <input name="nace_kodlari" defaultValue={t?.nace_kodlari ?? ''} placeholder="38.21.01 / 35.11.19" className={GIRDI} />
      </label>
      {grupAlaniGoster && (
        <label className="flex flex-col gap-1 text-sm">
          Sektör grubu
          <select name="grup_kod" defaultValue={t?.grup_kod ?? ''} className={GIRDI}>
            <option value="">—</option>
            {[...gruplar].sort(grupSirasi).map((g) => (
              <option key={g.kod} value={g.kod}>
                {g.kod} {g.ad}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Grup notu
        <input name="grup_notu" defaultValue={t?.grup_notu ?? ''} placeholder="Örn. G5 (+G2/G3)" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Firma grubu
        <input name="firma_grubu" defaultValue={t?.firma_grubu ?? ''} placeholder="Örn. Panda Grup" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sözleşme tarihi
        <input type="date" name="sozlesme_tarihi" defaultValue={t?.sozlesme_tarihi ?? ''} className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Sözleşme kapsamı
        <input name="sozlesme_kapsami" defaultValue={t?.sozlesme_kapsami ?? ''} placeholder="Çevre danışmanlığı, ÇED izleme, işletme planı…" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        İzin / lisans konusu
        <input name="izin_lisans_konusu" defaultValue={t?.izin_lisans_konusu ?? ''} className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Mevzuat notu
        <textarea name="mevzuat_notu" rows={2} defaultValue={t?.mevzuat_notu ?? ''} className={`${GIRDI} py-2`} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Not
        <textarea name="notlar" rows={2} defaultValue={t?.notlar ?? ''} className={`${GIRDI} py-2`} />
      </label>
    </>
  );
}

/** Tesis yetkilisi formunun alanları. */
export function KisiAlanlariFormu({ k, zorunlu = true }: { k?: Kisi; zorunlu?: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ad soyad
        <input name="ad_soyad" required={zorunlu} defaultValue={k?.ad_soyad} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Görevi
        <input name="gorev" defaultValue={k?.gorev ?? ''} placeholder="Çevre görevlisi, tesis müdürü…" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Telefon
        <input name="telefon" type="tel" defaultValue={k?.telefon ?? ''} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        E-posta
        <input name="eposta" type="email" defaultValue={k?.eposta ?? ''} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sorumlulukları
        <input name="sorumluluklar" defaultValue={k?.sorumluluklar ?? ''} placeholder="Atık beyanı, numuneler…" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Not (ziyarette işe yarayacak)
        <input name="profil_notu" defaultValue={k?.profil_notu ?? ''} className={GIRDI} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="imza_yetkisi" defaultChecked={k?.imza_yetkisi} className="h-[18px] w-[18px] accent-yesil" />
        İmza yetkisi var
      </label>
    </>
  );
}
