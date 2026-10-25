import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Supabase oturum çerezini her istekte tazeler ve oturumu olmayanları giriş sayfasına yönlendirir.
// Bu yalnızca iyimser bir kontroldür; asıl yetki kontrolü sayfalarda (oturumuDogrula) ve RLS'tedir.
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production' && process.env.GT_DEMO_DB_URL) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anahtar) return NextResponse.next();

  let yanit = NextResponse.next({ request });
  const supabase = createServerClient(url, anahtar, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(liste) {
        for (const { name, value } of liste) request.cookies.set(name, value);
        yanit = NextResponse.next({ request });
        for (const { name, value, options } of liste) yanit.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const yol = request.nextUrl.pathname;
  const girisSayfasi = yol.startsWith('/giris') || yol.startsWith('/auth/');
  if (!data?.claims && !girisSayfasi) {
    const hedef = request.nextUrl.clone();
    hedef.pathname = '/giris';
    hedef.search = '';
    return NextResponse.redirect(hedef);
  }
  return yanit;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
