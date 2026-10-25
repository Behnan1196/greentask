import { PLAN_DURUMU } from '@/lib/plan/durum';
import type { Kullanici, Tesis } from '@/lib/veri/tipler';

const GIRDI = 'min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal';

/** Plan oluşturma ve düzenleme formunun ortak alanları. */
export function PlanAlanlari({
  tesisler,
  ekip,
  d,
}: {
  tesisler: Tesis[];
  ekip: Kullanici[];
  d?: { baslik?: string; durum?: string; onayli_surum?: string | null; onay_tarihi?: string | null; sunum_tarihi?: string | null; hazirlayan_id?: string | null; notlar?: string | null; tesis_idleri?: string[] };
}) {
  return (
    <>
      <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
        Plan adı
        <input name="baslik" required defaultValue={d?.baslik} placeholder="Örn. Samsun Avdan Biyogaz Tesisi İşletme Planı" className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm font-medium">
        Tesis(ler)
        <select name="tesis_id" multiple defaultValue={d?.tesis_idleri} size={5} className={`${GIRDI} py-1`}>
          {tesisler.map((t) => (
            <option key={t.id} value={t.id}>
              {t.gt_kod} {t.kisa_ad}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-soluk">Birden çok seçmek için Ctrl tuşuna basılı tutun. Firma unvanı kontrolü bu tesislerin resmi unvanıyla yapılır.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Durum
        <select name="durum" defaultValue={d?.durum ?? 'revizyonda'} className={GIRDI}>
          {Object.entries(PLAN_DURUMU).map(([k, v]) => (
            <option key={k} value={k}>
              {v.ad}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hazırlayan
        <select name="hazirlayan_id" defaultValue={d?.hazirlayan_id ?? ''} className={GIRDI}>
          <option value="">Ben</option>
          {ekip.map((k) => (
            <option key={k.id} value={k.id}>
              {k.ad_soyad}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Onaylı sürüm
        <input name="onayli_surum" defaultValue={d?.onayli_surum ?? ''} placeholder="Örn. Eylül 2024" className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Onay tarihi
        <input type="date" name="onay_tarihi" defaultValue={d?.onay_tarihi ?? ''} className={GIRDI} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Planlanan sunum
        <input type="date" name="sunum_tarihi" defaultValue={d?.sunum_tarihi ?? ''} className={GIRDI} />
      </label>
      <label className="col-span-full flex flex-col gap-1 text-sm">
        Not
        <input name="notlar" defaultValue={d?.notlar ?? ''} placeholder="Revizyonun gerekçesi, Bakanlık yazısı…" className={GIRDI} />
      </label>
    </>
  );
}
