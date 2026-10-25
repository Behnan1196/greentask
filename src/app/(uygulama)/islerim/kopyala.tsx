'use client';

import { useState } from 'react';

export function KopyalaKutusu({ deger, etiket }: { deger: string; etiket: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="takvim-adresi">
        {etiket}
      </label>
      <input
        id="takvim-adresi"
        readOnly
        value={deger}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#c9cec6] bg-zemin px-2.5 font-mono text-xs"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(deger);
          setKopyalandi(true);
          setTimeout(() => setKopyalandi(false), 2000);
        }}
        className="min-h-10 rounded-lg border border-[#c9cec6] bg-white px-3 text-sm"
      >
        {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}
