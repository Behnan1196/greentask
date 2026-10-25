'use client';

import { useState, useTransition } from 'react';
import { taramaAnahtariOlustur } from './eylemler';

/** Yeni tarama anahtarı: bir kez gösterilir, kopyalanır. */
export function AnahtarUretici() {
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [bekliyor, baslat] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {!anahtar && (
        <button
          type="button"
          disabled={bekliyor}
          onClick={() =>
            baslat(async () => {
              const r = await taramaAnahtariOlustur();
              if (r.anahtar) setAnahtar(r.anahtar);
              else setHata(r.hata ?? 'Oluşturulamadı');
            })
          }
          className="min-h-10 self-start rounded-lg border border-yesil bg-white px-3 text-sm text-yesil-koyu"
        >
          {bekliyor ? 'Oluşturuluyor…' : 'Yeni anahtar oluştur'}
        </button>
      )}
      {anahtar && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-turuncu-zemin p-3">
          <span className="text-xs font-semibold text-turuncu">Bu anahtar bir daha gösterilmeyecek. Şimdi kopyalayın.</span>
          <code className="break-all rounded bg-white px-2 py-1.5 font-mono text-xs">{anahtar}</code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(anahtar);
              setKopyalandi(true);
            }}
            className="min-h-9 self-start rounded-md border border-[#c9cec6] bg-white px-2.5 text-xs"
          >
            {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      )}
      {hata && <p className="text-sm text-kirmizi">{hata}</p>}
    </div>
  );
}
