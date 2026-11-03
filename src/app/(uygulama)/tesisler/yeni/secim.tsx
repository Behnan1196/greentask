'use client';

import { useState } from 'react';

type Tur = { id: string; ad: string; aciklama: string | null };
type Grup = { kod: string; ad: string; tesisSayisi: number };

/**
 * Sektör grubu seçimi ve izlenecek yükümlülükler. Grup değişince, o gruptaki tesislerin çoğunda
 * takip edilen yükümlülükler işaretlenir; kullanıcı istediğini ekleyip çıkarabilir.
 */
export function GrupVeYukumlulukler({ gruplar, turler, oneriler }: { gruplar: Grup[]; turler: Tur[]; oneriler: Record<string, string[]> }) {
  const [grup, setGrup] = useState('');
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [elle, setElle] = useState(false);

  function grupSec(kod: string) {
    setGrup(kod);
    if (!elle) setSecili(new Set(oneriler[kod] ?? []));
  }
  function degistir(id: string, acik: boolean) {
    setElle(true);
    setSecili((s) => {
      const y = new Set(s);
      if (acik) y.add(id);
      else y.delete(id);
      return y;
    });
  }
  const g = gruplar.find((x) => x.kod === grup);

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Sektör grubu
        <select
          name="grup_kod"
          value={grup}
          onChange={(e) => grupSec(e.target.value)}
          className="min-h-10 rounded-lg border border-[#c9cec6] bg-white px-2.5 text-sm font-normal"
        >
          <option value="">—</option>
          {gruplar.map((x) => (
            <option key={x.kod} value={x.kod}>
              {x.kod} {x.ad}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="col-span-full flex flex-col gap-2 rounded-lg bg-[#f7f8f5] px-4 py-3">
        <legend className="sr-only">İzlenecek yükümlülükler</legend>
        <p className="text-sm font-medium">İzlenecek yükümlülükler · {secili.size}</p>
        <p className="text-xs text-soluk">
          {g
            ? elle
              ? 'Seçimi elle değiştirdiniz.'
              : `${g.kod} grubundaki ${g.tesisSayisi} tesisin çoğunda takip edilenler işaretlendi.`
            : 'Sektör grubu seçince benzer tesislerde takip edilenler işaretlenir.'}{' '}
          Tarihleri tesis kartından girersiniz; sonradan yükümlülük ekleyip çıkarabilirsiniz.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-4 gap-y-1.5">
          {turler.map((t) => (
            <label key={t.id} className="flex items-start gap-2 text-sm" title={t.aciklama ?? undefined}>
              <input
                type="checkbox"
                name="tur_id"
                value={t.id}
                checked={secili.has(t.id)}
                onChange={(e) => degistir(t.id, e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-yesil"
              />
              {t.ad}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
