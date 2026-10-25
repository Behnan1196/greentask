import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { demoModu } from '@/lib/veri/depo';
import { GirisFormu } from './giris-formu';
import { SifirlamaFormu } from './sifirlama-formu';

export const metadata: Metadata = { title: 'Giriş' };

export default async function GirisSayfasi(props: PageProps<'/giris'>) {
  if (demoModu()) redirect('/');
  const { hata } = await props.searchParams;
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
        {hata === 'baglanti' && (
          <p role="alert" className="mb-4 rounded-lg bg-kirmizi-zemin px-3 py-2 text-sm text-kirmizi">
            Bağlantı geçersiz ya da süresi dolmuş. Aşağıdan yeni bağlantı isteyin.
          </p>
        )}
        <GirisFormu />
        <SifirlamaFormu />
        <p className="mt-4 text-sm text-soluk">Hesabınız yoksa sistem yöneticisinden davet isteyin.</p>
      </div>
    </main>
  );
}
