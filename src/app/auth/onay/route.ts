import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseSunucu } from '@/lib/supabase/sunucu';

// Davet ve şifre sıfırlama e-postalarındaki bağlantı buraya gelir:
//   {{ .SiteURL }}/auth/onay?token_hash={{ .TokenHash }}&type=invite
// Token doğrulanınca oturum açılır ve kullanıcı şifre belirleme sayfasına yönlendirilir.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const tur = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && tur) {
    const db = await supabaseSunucu();
    const { error } = await db.auth.verifyOtp({ type: tur, token_hash: tokenHash });
    if (!error) {
      const hedef = tur === 'invite' || tur === 'recovery' ? '/sifre' : '/';
      return NextResponse.redirect(new URL(hedef, origin));
    }
  }
  return NextResponse.redirect(new URL('/giris?hata=baglanti', origin));
}
