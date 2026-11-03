'use server';

import { revalidatePath } from 'next/cache';
import { oturumuDogrula } from '@/lib/veri/depo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function yonetici() {
  const o = await oturumuDogrula();
  if (o.kullanici.rol !== 'yonetici') throw new Error('Bu ayarları yalnızca yönetici değiştirebilir');
  return o;
}

export async function profilKaydet(form: FormData) {
  const { depo, kullanici } = await yonetici();
  const id = String(form.get('id') ?? '');
  if (!UUID.test(id)) throw new Error('Geçersiz istek');
  const rol = form.get('rol') === 'yonetici' ? 'yonetici' : 'muhendis';
  const aktif = form.get('aktif') === 'on';
  if (id === kullanici.id && (rol !== 'yonetici' || !aktif)) {
    throw new Error('Kendi yönetici yetkinizi kaldıramaz, hesabınızı kapatamazsınız (önce başka birini yönetici yapın, o yapsın)');
  }
  await depo.profilGuncelle(id, { ad_soyad: String(form.get('ad_soyad') ?? '').trim().slice(0, 120), rol, aktif });
  revalidatePath('/', 'layout');
}

export async function grupKaydet(form: FormData) {
  const { depo } = await yonetici();
  const kod = String(form.get('kod') ?? '').trim().toUpperCase();
  const ad = String(form.get('ad') ?? '').trim();
  if (!/^G\d{1,2}$/.test(kod) || !ad) throw new Error('Kod G1–G99 biçiminde, ad zorunlu');
  await depo.sektorGrubuKaydet({ kod, ad, aciklama: String(form.get('aciklama') ?? '').trim() || null });
  revalidatePath('/', 'layout');
}
