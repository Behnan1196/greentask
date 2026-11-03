import type { Asama, KuralTipi, Parametreler } from '@/lib/termin/motor';
import type { IsKarti } from '@/lib/veri/tipler';

export const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal disabled:bg-[#f4f5f2]';
export const ANA = 'min-h-10 rounded-lg bg-yesil px-4 text-sm font-semibold text-white hover:bg-yesil-koyu';

/** İş kartı alanları (her satır bir madde). */
export function IsKartiAlanlari({ k, baslikGoster = true }: { k?: Partial<IsKarti>; baslikGoster?: boolean }) {
  return (
    <>
      {baslikGoster && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Başlık
          <input name="baslik" required defaultValue={k?.baslik ?? ''} placeholder="Örn. Yeni tesis açılışı" className={GIRDI} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Ne yapılır (her satır bir adım)
        <textarea name="yapilacaklar" rows={6} defaultValue={k?.yapilacaklar ?? ''} placeholder={'Geçerlilik bitişini tesis kartından kontrol et\nTesisten güncel kapasite bilgisini iste\n…'} className={`${GIRDI} py-2`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kimden ne istenir (her satır bir madde)
        <textarea name="istenecekler" rows={4} defaultValue={k?.istenecekler ?? ''} placeholder={'Tesis: imza sirküleri, vergi levhası\nLaboratuvar: akreditasyon belgesi'} className={`${GIRDI} py-2`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nereye, hangi formatta
        <textarea name="nereye" rows={2} defaultValue={k?.nereye ?? ''} placeholder="Başvuru yeri / uygulama (EÇBS, ÇBS, e-Devlet…), dosya formatı, ıslak imza gerekip gerekmediği" className={`${GIRDI} py-2`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dikkat (sık hatalar, nüanslar)
        <textarea name="dikkat" rows={3} defaultValue={k?.dikkat ?? ''} className={`${GIRDI} py-2`} />
      </label>
    </>
  );
}

function SureAlani({ ad, etiket, deger, birim, kapali }: { ad: string; etiket: string; deger?: number; birim: 'gun' | 'ay'; kapali: boolean }) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="mb-1">{etiket}</legend>
      <div className="flex gap-2">
        <input name={`${ad}_deger`} type="number" min={0} defaultValue={deger ?? ''} disabled={kapali} aria-label={`${etiket} değeri`} className={`${GIRDI} w-24`} />
        <select name={`${ad}_birim`} defaultValue={birim} disabled={kapali} aria-label={`${etiket} birimi`} className={GIRDI}>
          <option value="gun">gün</option>
          <option value="ay">ay</option>
        </select>
      </div>
    </fieldset>
  );
}

function Sayi({ ad, etiket, deger, kapali, ipucu }: { ad: string; etiket: string; deger?: number; kapali: boolean; ipucu?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {etiket}
      <input name={ad} type="number" min={0} defaultValue={deger ?? ''} disabled={kapali} className={GIRDI} />
      {ipucu && <span className="text-xs text-soluk">{ipucu}</span>}
    </label>
  );
}

function Kutu({ ad, etiket, deger, kapali }: { ad: string; etiket: string; deger?: boolean; kapali: boolean }) {
  return (
    <label className="col-span-full flex items-center gap-2 text-sm">
      <input type="checkbox" name={ad} defaultChecked={!!deger} disabled={kapali} className="h-[18px] w-[18px] accent-yesil" />
      {etiket}
    </label>
  );
}

/** Kural tipine göre parametre alanları. */
export function KuralAlanlari({ tip, p, kapali }: { tip: KuralTipi; p: Parametreler; kapali: boolean }) {
  const aksiyon = (
    <label className="flex flex-col gap-1 text-sm">
      Aksiyon adı
      <input name="aksiyon_adi" defaultValue={p.aksiyon_adi ?? ''} disabled={kapali} placeholder="Ölçüm, Numune alma, Sunum…" className={GIRDI} />
    </label>
  );
  const imza = <Kutu ad="imzali_nusha" etiket="Belge tesise imzalatılır: imzalı nüsha teslim alınana kadar tesis kartında uyarı göster" deger={p.imzali_nusha} kapali={kapali} />;
  switch (tip) {
    case 'bitis_tarihi': {
      const asamalar: (Asama | undefined)[] = [...(p.asamalar ?? []), undefined, undefined].slice(0, Math.max(2, (p.asamalar?.length ?? 0) + 1));
      return (
        <>
          <Sayi ad="gecerlilik_ay" etiket="Belge geçerliliği (ay)" deger={p.gecerlilik_ay} kapali={kapali} ipucu="Bitiş tarihi girilmeyip yalnızca belge tarihi girilirse kullanılır" />
          <fieldset className="col-span-full flex flex-col gap-2 text-sm">
            <legend className="mb-1 font-medium">Uyarı aşamaları (bitişten ne kadar önce)</legend>
            {asamalar.map((a, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="sr-only">Aşama {i + 1} adı</span>
                  <input name={`asama_ad_${i}`} defaultValue={a?.ad ?? ''} disabled={kapali} placeholder={i === 0 ? 'Ön hazırlık' : 'Başvuru'} className={GIRDI} />
                </label>
                <input name={`asama_${i}_deger`} type="number" min={0} defaultValue={a ? (a.ay ?? a.gun ?? '') : ''} disabled={kapali} aria-label={`Aşama ${i + 1} süresi`} className={`${GIRDI} w-24`} />
                <select name={`asama_${i}_birim`} defaultValue={a?.ay != null ? 'ay' : 'gun'} disabled={kapali} aria-label={`Aşama ${i + 1} birimi`} className={GIRDI}>
                  <option value="gun">gün önce</option>
                  <option value="ay">ay önce</option>
                </select>
              </div>
            ))}
            <span className="text-xs text-soluk">Boş bırakılan satır silinir. Yeni aşama için kaydedip boş satırı doldurun.</span>
          </fieldset>
          {aksiyon}
          {imza}
        </>
      );
    }
    case 'son_islem_periyot':
      return (
        <>
          {p.atiksu_niteligi ? (
            <p className="col-span-full text-sm text-murekkep-2">Periyot SKKY tablosundan, tesisin debisine / eşdeğer nüfusuna göre hesaplanır (tesis bazında girilir).</p>
          ) : (
            <SureAlani ad="periyot" etiket="Periyot" deger={p.periyot_ay ?? p.periyot_gun} birim={p.periyot_ay != null ? 'ay' : 'gun'} kapali={kapali} />
          )}
          <SureAlani ad="hazirlik" etiket="Ne kadar önce uyarılsın" deger={p.hazirlik_ay ?? p.hazirlik_gun} birim={p.hazirlik_ay != null ? 'ay' : 'gun'} kapali={kapali} />
          {aksiyon}
          {imza}
        </>
      );
    case 'sozlesme_takvimi':
      return (
        <>
          <Sayi ad="ilk_gun" etiket="İlk gerçekleşme: sözleşmeden kaç gün sonra" deger={p.ilk_gun} kapali={kapali} />
          <Sayi ad="hazirlik_gun" etiket="Kaç gün önce uyarılsın" deger={p.hazirlik_gun} kapali={kapali} />
          {aksiyon}
          {imza}
        </>
      );
    case 'yenilenen_sozlesme':
      return (
        <>
          <Sayi ad="sure_yil" etiket="Sözleşme süresi (yıl)" deger={p.sure_yil} kapali={kapali} />
          <Sayi ad="yenileme_yil" etiket="Yenileme süresi (yıl)" deger={p.yenileme_yil} kapali={kapali} />
          <Sayi ad="hazirlik_gun" etiket="Kaç gün önce uyarılsın" deger={p.hazirlik_gun} kapali={kapali} />
          <Kutu ad="yenileme" etiket="Süre bitince kendiliğinden yenilenir" deger={p.yenileme} kapali={kapali} />
          {aksiyon}
          {imza}
        </>
      );
    case 'donemsel_rapor':
      return (
        <>
          <Sayi ad="periyot_ay" etiket="Dönem uzunluğu (ay)" deger={p.periyot_ay} kapali={kapali} />
          <Sayi ad="sunum_gun" etiket="Dönem sonundan kaç gün içinde sunulur" deger={p.sunum_gun} kapali={kapali} />
          {imza}
        </>
      );
    case 'yillik_sabit_tarih':
      return (
        <>
          <Sayi ad="gun_no" etiket="Gün" deger={p.gun_no} kapali={kapali} />
          <Sayi ad="ay" etiket="Ay (1–12)" deger={p.ay} kapali={kapali} />
          <Sayi ad="hazirlik_gun" etiket="Kaç gün önce uyarılsın" deger={p.hazirlik_gun} kapali={kapali} />
          {aksiyon}
          <Kutu
            ad="onay_gerekli"
            etiket="Kurum onayı gerekir: sunulduktan sonra onay gelene kadar “süreçte” kalır, kaç gündür beklediği gösterilir (ÇBS/GİRGİR onayı gibi)"
            deger={p.onay_gerekli}
            kapali={kapali}
          />
          {imza}
        </>
      );
  }
}
