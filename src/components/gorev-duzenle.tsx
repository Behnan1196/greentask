import { gorevDurumunuDegistir, gorevGuncelle } from '@/app/(uygulama)/toplantilar/eylemler';
import type { Gorev, Kullanici } from '@/lib/veri/tipler';

const GIRDI = 'min-h-9 rounded-md border border-[#c9cec6] bg-white px-2 text-sm';

/** Görev satırının altındaki açılır düzenleme formu. */
export function GorevDuzenle({ g, ekip }: { g: Gorev; ekip: Kullanici[] }) {
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-xs text-soluk">Düzenle</summary>
      <form action={gorevGuncelle} className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        <input type="hidden" name="id" value={g.id} />
        <label className="col-span-full flex flex-col gap-1 text-xs">
          Görev
          <input name="baslik" required defaultValue={g.baslik} className={GIRDI} />
        </label>
        <label className="col-span-full flex flex-col gap-1 text-xs">
          Açıklama
          <textarea name="aciklama" rows={2} defaultValue={g.aciklama ?? ''} className={`${GIRDI} py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Sorumlu
          <select name="sorumlu_id" defaultValue={g.sorumlu_id ?? ''} className={GIRDI}>
            <option value="">Atanmamış</option>
            {ekip.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad_soyad}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Son tarih
          <input type="date" name="son_tarih" defaultValue={g.son_tarih ?? ''} className={GIRDI} />
        </label>
        <button className="min-h-9 self-end justify-self-start rounded-md bg-yesil px-3 text-xs font-semibold text-white hover:bg-yesil-koyu">Kaydet</button>
      </form>
      {(g.durum === 'acik' || g.durum === 'devam') && (
        <form action={gorevDurumunuDegistir} className="mt-2">
          <input type="hidden" name="id" value={g.id} />
          <input type="hidden" name="durum" value="iptal" />
          <button className="text-xs text-soluk hover:text-kirmizi">Görevi iptal et</button>
        </form>
      )}
      {(g.durum === 'tamamlandi' || g.durum === 'iptal') && (
        <form action={gorevDurumunuDegistir} className="mt-2">
          <input type="hidden" name="id" value={g.id} />
          <input type="hidden" name="durum" value="acik" />
          <button className="text-xs text-soluk hover:text-yesil">Yeniden aç</button>
        </form>
      )}
    </details>
  );
}
