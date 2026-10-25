'use server';

import { redirect } from 'next/navigation';
import { supabaseSunucu } from '@/lib/supabase/sunucu';

export type GirisDurumu = { hata?: string };

export async function girisYap(_onceki: GirisDurumu, form: FormData): Promise<GirisDurumu> {
  const eposta = String(form.get('eposta') ?? '').trim();
  const sifre = String(form.get('sifre') ?? '');
  if (!eposta || !sifre) return { hata: 'E-posta ve şifre gerekli.' };

  const db = await supabaseSunucu();
  const { error } = await db.auth.signInWithPassword({ email: eposta, password: sifre });
  if (error) return { hata: 'E-posta veya şifre hatalı.' };
  redirect('/');
}

export async function cikisYap() {
  const db = await supabaseSunucu();
  await db.auth.signOut();
  redirect('/giris');
}
