import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { supabaseSunucu } from '@/lib/supabase/sunucu';
import { demoDepo } from './demo-depo';
import { supabaseDepo } from './supabase-depo';
import type { Depo, Kullanici } from './tipler';

export const demoModu = () => process.env.NODE_ENV !== 'production' && !!process.env.GT_DEMO_DB_URL;

/** İstek başına tek veri katmanı. */
export const depo = cache(async (): Promise<Depo> => (demoModu() ? demoDepo() : supabaseDepo(await supabaseSunucu())));

/** Oturum açmış, aktif kullanıcıyı döner; yoksa giriş sayfasına yönlendirir. Her sayfada ve eylemde çağrılır. */
export const oturumuDogrula = cache(async (): Promise<{ depo: Depo; kullanici: Kullanici }> => {
  const d = await depo();
  const kullanici = await d.kullanici();
  if (!kullanici) redirect('/giris');
  return { depo: d, kullanici };
});
