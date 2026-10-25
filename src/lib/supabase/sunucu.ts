import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function supabaseAyarlari() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anahtar) {
    throw new Error(
      'Supabase ayarları eksik: .env.local dosyasına NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ekleyin (bkz. README).',
    );
  }
  return { url, anahtar };
}

/** Sunucu bileşenleri ve Server Action'lar için Supabase istemcisi (kullanıcının oturumuyla, RLS geçerli). */
export async function supabaseSunucu() {
  const cerezler = await cookies(); // önce: sayfayı istek anına (dinamik) bağlar
  const { url, anahtar } = supabaseAyarlari();
  return createServerClient(url, anahtar, {
    cookies: {
      getAll() {
        return cerezler.getAll();
      },
      setAll(liste) {
        try {
          for (const { name, value, options } of liste) cerezler.set(name, value, options);
        } catch {
          // Sunucu bileşeninden çağrıldığında çerez yazılamaz; oturum yenilemeyi proxy üstlenir.
        }
      },
    },
  });
}
