'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BAGLANTILAR: { href: string; ad: string; ek?: string }[] = [
  { href: '/', ad: 'Kokpit' },
  { href: '/islerim', ad: 'Benim İşlerim' },
  { href: '/tesisler', ad: 'Tesisler' },
  { href: '/toplantilar', ad: 'Toplantı & Görevler', ek: '/gorevler' },
  { href: '/saha', ad: 'Saha Ziyaretleri' },
];

const YAKINDA = ['Belge Tasnifi', 'Mevzuat', 'İşletme Planları'];

export function Menu() {
  const yol = usePathname();
  return (
    <nav aria-label="Ana menü" className="flex flex-col gap-1">
      {BAGLANTILAR.map((b) => {
        const aktif = b.href === '/' ? yol === '/' : yol.startsWith(b.href) || (!!b.ek && yol.startsWith(b.ek));
        return (
          <Link
            key={b.href}
            href={b.href}
            aria-current={aktif ? 'page' : undefined}
            className={`rounded-lg px-3 py-2.5 text-sm no-underline ${
              aktif ? 'bg-yesil-acik font-semibold text-yesil-koyu' : 'text-murekkep hover:bg-zemin'
            }`}
          >
            {b.ad}
          </Link>
        );
      })}
      {YAKINDA.map((ad) => (
        <span key={ad} className="hidden px-3 py-2.5 text-sm text-[#6b726d] md:block">
          {ad} · yakında
        </span>
      ))}
    </nav>
  );
}
