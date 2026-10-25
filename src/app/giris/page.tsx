import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { demoModu } from '@/lib/veri/depo';
import { GirisFormu } from './giris-formu';

export const metadata: Metadata = { title: 'Giriş' };

export default function GirisSayfasi() {
  if (demoModu()) redirect('/');
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-cizgi bg-yuzey p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yesil text-sm font-bold text-white">GT</div>
          <div>
            <p className="font-semibold">Greentask</p>
            <p className="text-sm text-soluk">İş Sistemi</p>
          </div>
        </div>
        <GirisFormu />
        <p className="mt-6 text-sm text-soluk">Hesabınız yoksa sistem yöneticisinden davet isteyin.</p>
      </div>
    </main>
  );
}
