'use client';

import { useActionState } from 'react';
import { sifreBelirle, type SifreDurumu } from './eylemler';

const GIRDI = 'min-h-11 rounded-lg border border-[#c9cec6] bg-white px-3 text-base font-normal';

export default function SifreSayfasi() {
  const [durum, eylem, bekliyor] = useActionState<SifreDurumu, FormData>(sifreBelirle, {});
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-cizgi bg-yuzey p-8">
        <h1 className="mb-1 text-xl font-semibold">Şifre belirleyin</h1>
        <p className="mb-6 text-sm text-soluk">Bundan sonra e-postanız ve bu şifreyle giriş yapacaksınız.</p>
        <form action={eylem} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Yeni şifre
            <input name="sifre" type="password" autoComplete="new-password" minLength={8} required className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Yeni şifre (tekrar)
            <input name="tekrar" type="password" autoComplete="new-password" minLength={8} required className={GIRDI} />
          </label>
          {durum.hata && (
            <p role="alert" className="text-sm text-kirmizi">
              {durum.hata}
            </p>
          )}
          <button disabled={bekliyor} className="min-h-11 rounded-lg bg-yesil font-semibold text-white hover:bg-yesil-koyu disabled:opacity-60">
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
          </button>
        </form>
      </div>
    </main>
  );
}
