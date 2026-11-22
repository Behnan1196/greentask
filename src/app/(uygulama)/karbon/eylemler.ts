'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ayarlariAl, formdanFaaliyet, satirdanFaaliyet } from '@/lib/karbon/form';
import { hesapla } from '@/lib/karbon/motor';
import { oturumuDogrula } from '@/lib/veri/depo';
import type { KarbonEnvanterAlanlari, SinirYaklasimi } from '@/lib/veri/tipler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SINIRLAR: SinirYaklasimi[] = ['operasyonel_kontrol', 'finansal_kontrol', 'hisse_payi'];

const yenile = () => revalidatePath('/', 'layout');
const metin = (f: FormData, ad: string) => String(f.get(ad) ?? '').trim();

function kimlik(f: FormData, ad = 'id') {
  const v = metin(f, ad);
  if (!UUID.test(v)) throw new Error(`Geçersiz kimlik: ${ad}`);
  return v;
}

function yil(f: FormData, ad: string, zorunlu: boolean) {
  const v = metin(f, ad);
  if (!v && !zorunlu) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error('Geçerli bir yıl girilmeli');
  return n;
}

function envanterAlanlari(f: FormData): KarbonEnvanterAlanlari {
  const sinir = metin(f, 'sinir_yaklasimi') as SinirYaklasimi;
  const gwp = metin(f, 'gwp');
  const y = yil(f, 'yil', true)!;
  return {
    tesis_id: kimlik(f, 'tesis_id'),
    yil: y,
    baz_yil: yil(f, 'baz_yil', false),
    baslik: metin(f, 'baslik') || `Kurumsal karbon ayak izi ${y}`,
    sinir_yaklasimi: SINIRLAR.includes(sinir) ? sinir : 'operasyonel_kontrol',
    sinir_aciklamasi: metin(f, 'sinir_aciklamasi') || null,
    haric_tutulanlar: metin(f, 'haric_tutulanlar') || null,
    gwp: gwp === 'AR6' ? 'AR6' : 'AR5',
    yakit_wtt: f.get('yakit_wtt') === '1',
    hazirlayan_id: UUID.test(metin(f, 'hazirlayan_id')) ? metin(f, 'hazirlayan_id') : null,
    notlar: metin(f, 'notlar') || null,
  };
}

export async function envanterOlustur(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const a = envanterAlanlari(form);
  const id = await depo.envanterOlustur({ ...a, hazirlayan_id: a.hazirlayan_id ?? kullanici.id });
  yenile();
  redirect(`/karbon/${id}`);
}

export async function envanterAyarla(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.envanterGuncelle(kimlik(form), envanterAlanlari(form));
  yenile();
}

export async function envanterSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.envanterSil(kimlik(form));
  yenile();
  redirect('/karbon');
}

/** Faaliyet ekler ya da (faaliyet_id varsa) günceller. Girdi önce motordan geçirilir; hata varsa kaydedilmez. */
export async function faaliyetKaydet(form: FormData) {
  const { depo } = await oturumuDogrula();
  const envId = kimlik(form);
  const faaliyetId = metin(form, 'faaliyet_id');
  const env = await depo.envanter(envId);
  if (!env) throw new Error('Envanter bulunamadı');
  let hata: string | null = null;
  let kayit: ReturnType<typeof formdanFaaliyet> | null = null;
  try {
    kayit = formdanFaaliyet(form);
    hesapla([{ ...kayit.veri, id: 'deneme' } as Parameters<typeof hesapla>[0][number]], ayarlariAl(env));
  } catch (e) {
    hata = e instanceof Error ? e.message : String(e);
  }
  if (hata || !kayit) redirect(`/karbon/${envId}?tur=${encodeURIComponent(metin(form, 'tur'))}&hata=${encodeURIComponent(hata ?? 'Kaydedilemedi')}#ekle`);
  if (UUID.test(faaliyetId)) await depo.faaliyetGuncelle(faaliyetId, kayit.veri, kayit.kanit);
  else await depo.faaliyetEkle(envId, kayit.veri, kayit.kanit);
  yenile();
  redirect(`/karbon/${envId}?tur=${encodeURIComponent(kayit.veri.tur)}#faaliyetler`);
}

export async function faaliyetSil(form: FormData) {
  const { depo } = await oturumuDogrula();
  await depo.faaliyetSil(kimlik(form, 'faaliyet_id'));
  yenile();
}

export async function envanterKilitle(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  const id = kimlik(form);
  const env = await depo.envanter(id);
  if (!env) throw new Error('Envanter bulunamadı');
  const sonuc = hesapla((await depo.faaliyetler(id)).map(satirdanFaaliyet), ayarlariAl(env));
  await depo.envanterKilitle(id, { ...sonuc, kilit: new Date().toISOString() }, kullanici.id);
  yenile();
}

export async function envanterKilidiAc(form: FormData) {
  const { depo, kullanici } = await oturumuDogrula();
  if (kullanici.rol !== 'yonetici') throw new Error('Kilidi yalnızca yönetici açabilir');
  await depo.envanterKilidiAc(kimlik(form));
  yenile();
}
