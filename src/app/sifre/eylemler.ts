'use server';

import { redirect } from 'next/navigation';
import { supabaseSunucu } from '@/lib/supabase/sunucu';

export type SifreDurumu = { hata?: string };

export async function sifreBelirle(_onceki: SifreDurumu, form: FormData): Promise<SifreDurumu> {
  const sifre = String(form.get('sifre') ?? '');
  const tekrar = String(form.get('tekrar') ?? '');
  if (sifre.length < 8) return { hata: 'Şifre en az 8 karakter olmalı.' };
  if (sifre !== tekrar) return { hata: 'Şifreler aynı değil.' };

  const db = await supabaseSunucu();
  const { data } = await db.auth.getUser();
  if (!data.user) return { hata: 'Bağlantının süresi dolmuş. Giriş sayfasından yeni bağlantı isteyin.' };

  const { error } = await db.auth.updateUser({ password: sifre });
  if (error) return { hata: `Şifre kaydedilemedi: ${error.message}` };
  redirect('/');
}
