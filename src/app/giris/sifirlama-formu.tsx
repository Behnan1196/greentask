'use client';

import { useActionState } from 'react';
import { sifreSifirla, type SifirlamaDurumu } from './eylemler';

export function SifirlamaFormu() {
  const [durum, eylem, bekliyor] = useActionState<SifirlamaDurumu, FormData>(sifreSifirla, {});
  return (
    <details className="mt-6 text-sm">
      <summary className="cursor-pointer text-yesil">Şifremi unuttum / ilk kez giriş yapıyorum</summary>
      <form action={eylem} className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          E-posta
          <input name="eposta" type="email" required className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-3 text-base" />
        </label>
        <button disabled={bekliyor} className="min-h-11 rounded-lg border border-[#c9cec6] bg-white disabled:opacity-60">
          {bekliyor ? 'Gönderiliyor…' : 'Şifre belirleme bağlantısı gönder'}
        </button>
        {durum.mesaj && <p className="text-yesil-koyu">{durum.mesaj}</p>}
        {durum.hata && <p role="alert" className="text-kirmizi">{durum.hata}</p>}
      </form>
    </details>
  );
}
