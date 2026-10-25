'use client';

import { useActionState } from 'react';
import { girisYap, type GirisDurumu } from './eylemler';

export function GirisFormu() {
  const [durum, eylem, bekliyor] = useActionState<GirisDurumu, FormData>(girisYap, {});
  return (
    <form action={eylem} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        E-posta
        <input
          name="eposta"
          type="email"
          autoComplete="email"
          required
          className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-3 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Şifre
        <input
          name="sifre"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded-lg border border-[#c9cec6] bg-white px-3 text-base font-normal"
        />
      </label>
      {durum.hata && (
        <p role="alert" className="text-sm text-kirmizi">
          {durum.hata}
        </p>
      )}
      <button
        disabled={bekliyor}
        className="min-h-11 rounded-lg bg-yesil font-semibold text-white hover:bg-yesil-koyu disabled:opacity-60"
      >
        {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
