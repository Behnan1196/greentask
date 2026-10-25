import 'server-only';
import { supabaseSunucu } from '@/lib/supabase/sunucu';
import type { Depo } from './tipler';

type Istemci = Awaited<ReturnType<typeof supabaseSunucu>>;

function hataKontrol<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`Veritabanı hatası: ${r.error.message}`);
  return r.data as T;
}

/** Supabase ile çalışan veri katmanı. Tüm sorgular kullanıcının oturumuyla yapılır; yetki RLS'te. */
export function supabaseDepo(db: Istemci): Depo {
  return {
    async kullanici() {
      const { data } = await db.auth.getUser();
      if (!data.user) return null;
      const p = await db.from('profiller').select('id, ad_soyad, eposta, rol, aktif').eq('id', data.user.id).maybeSingle();
      if (!p.data || !p.data.aktif) return null;
      return { id: p.data.id, ad_soyad: p.data.ad_soyad, eposta: p.data.eposta, rol: p.data.rol };
    },
    async tesisler() {
      return hataKontrol(await db.from('tesisler').select('*').eq('aktif', true).order('gt_kod'));
    },
    async tesis(gtKod) {
      return hataKontrol(await db.from('tesisler').select('*').eq('gt_kod', gtKod).maybeSingle());
    },
    async kisiler(tesisId) {
      return hataKontrol(await db.from('kisiler').select('*').eq('tesis_id', tesisId).order('ad_soyad'));
    },
    async turler() {
      return hataKontrol(await db.from('yukumluluk_turleri').select('*').eq('aktif', true).order('sira'));
    },
    async yukumlulukler(tesisId) {
      let q = db.from('tesis_yukumlulukleri').select('*');
      if (tesisId) q = q.eq('tesis_id', tesisId);
      return hataKontrol(await q);
    },
    async olaylar(idler) {
      let q = db.from('yukumluluk_olaylari').select('id, tesis_yukumluluk_id, tarih, tur, aciklama').order('tarih');
      if (idler) q = q.in('tesis_yukumluluk_id', idler);
      return hataKontrol(await q);
    },
    async mevzuatDegisiklikleri() {
      return hataKontrol(await db.from('mevzuat_degisiklikleri').select('*').order('tespit_tarihi', { ascending: false }));
    },
    async yukumlulukGuncelle(id, alanlar) {
      hataKontrol(await db.from('tesis_yukumlulukleri').update(alanlar).eq('id', id).select('id').single());
    },
    async olayEkle(o) {
      hataKontrol(await db.from('yukumluluk_olaylari').insert(o).select('id').single());
    },
    async olaySil(id) {
      hataKontrol(await db.from('yukumluluk_olaylari').delete().eq('id', id).select('id').single());
    },
  };
}
