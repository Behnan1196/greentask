import { Suspense } from 'react';
import { cikisYap } from '@/app/giris/eylemler';
import { Menu } from '@/components/menu';
import { demoModu, oturumuDogrula } from '@/lib/veri/depo';

// Tüm uygulama sayfaları oturuma bağlıdır; statik üretilmez.
export const dynamic = 'force-dynamic';

async function KullaniciKutusu() {
  const { kullanici } = await oturumuDogrula();
  return (
    <div className="flex flex-col gap-1 border-t border-cizgi px-2 pt-4">
      <span className="text-sm font-semibold">{kullanici.ad_soyad}</span>
      <span className="text-xs text-soluk">{kullanici.rol === 'yonetici' ? 'Yönetici' : 'Mühendis'}</span>
      {demoModu() ? (
        <span className="mt-1 text-xs font-semibold text-turuncu">Demo modu · yerel veritabanı</span>
      ) : (
        <form action={cikisYap}>
          <button className="mt-1 text-sm text-yesil hover:text-yesil-koyu">Çıkış yap</button>
        </form>
      )}
    </div>
  );
}

export default function UygulamaDuzeni({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="flex max-w-full flex-[1_1_220px] flex-col gap-1 border-r border-cizgi bg-yuzey px-4 py-6 md:max-w-[260px]">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yesil text-sm font-bold text-white">GT</div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold">Greentask</span>
            <span className="text-xs text-soluk">İş Sistemi · Pilot</span>
          </div>
        </div>
        <Menu />
        <div className="min-h-6 flex-grow" />
        <Suspense fallback={null}>
          <KullaniciKutusu />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-[999_1_560px] px-4 py-8 sm:px-10">{children}</main>
    </div>
  );
}
