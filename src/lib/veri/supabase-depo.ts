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
    async kullanicilar() {
      return hataKontrol(await db.from('profiller').select('id, ad_soyad, eposta, rol').eq('aktif', true).order('ad_soyad'));
    },
    async tesisSorumlusuAta(tesisId, kullaniciId) {
      hataKontrol(await db.from('tesisler').update({ sorumlu_id: kullaniciId }).eq('id', tesisId).select('id').single());
    },
    async gorevler({ sorumluId, acik, toplantiId, toplantidan }) {
      let q = db.from('gorevler').select('*').order('son_tarih', { ascending: true, nullsFirst: false });
      if (sorumluId) q = q.eq('sorumlu_id', sorumluId);
      if (acik) q = q.in('durum', ['acik', 'devam']);
      if (toplantiId) q = q.eq('toplanti_id', toplantiId);
      if (toplantidan) q = q.not('toplanti_id', 'is', null);
      return hataKontrol(await q);
    },
    async gorevEkle(g) {
      const r = await db.from('gorevler').insert({ kaynak: 'elle', ...g }).select('id').single();
      if (r.error) throw new Error(`Veritabanı hatası: ${r.error.message}`);
      return (r.data as { id: string }).id;
    },
    async toplantilar() {
      return hataKontrol(await db.from('toplantilar').select('*').order('tarih', { ascending: false }));
    },
    async toplanti(id) {
      return hataKontrol(await db.from('toplantilar').select('*').eq('id', id).maybeSingle());
    },
    async toplantiOlustur(t) {
      const r = await db.from('toplantilar').insert(t).select('id').single();
      if (r.error) throw new Error(`Veritabanı hatası: ${r.error.message}`);
      return (r.data as { id: string }).id;
    },
    async toplantiGuncelle(id, alanlar) {
      hataKontrol(await db.from('toplantilar').update(alanlar).eq('id', id).select('id').single());
    },
    async maddeler(toplantiId) {
      return hataKontrol(await db.from('toplanti_maddeleri').select('*').eq('toplanti_id', toplantiId).order('sira').order('created_at'));
    },
    async maddeEkle(m) {
      const son = await db.from('toplanti_maddeleri').select('sira').eq('toplanti_id', m.toplanti_id).order('sira', { ascending: false }).limit(1);
      const sira = ((son.data?.[0] as { sira: number } | undefined)?.sira ?? 0) + 1;
      hataKontrol(await db.from('toplanti_maddeleri').insert({ ...m, sira }).select('id').single());
    },
    async maddeGuncelle(id, alanlar) {
      hataKontrol(await db.from('toplanti_maddeleri').update(alanlar).eq('id', id).select('id').single());
    },
    async maddeSil(id) {
      hataKontrol(await db.from('toplanti_maddeleri').delete().eq('id', id).select('id').single());
    },
    async ziyaretler(filtre = {}) {
      let q = db.from('saha_ziyaretleri').select('*').order('tarih', { ascending: false });
      if (filtre.tesisId) q = q.eq('tesis_id', filtre.tesisId);
      return hataKontrol(await q);
    },
    async ziyaret(id) {
      return hataKontrol(await db.from('saha_ziyaretleri').select('*').eq('id', id).maybeSingle());
    },
    async ziyaretOlustur(z) {
      const r = await db.from('saha_ziyaretleri').insert(z).select('id').single();
      if (r.error) throw new Error(`Veritabanı hatası: ${r.error.message}`);
      return (r.data as { id: string }).id;
    },
    async ziyaretGuncelle(id, alanlar) {
      hataKontrol(await db.from('saha_ziyaretleri').update(alanlar).eq('id', id).select('id').single());
    },
    async bulgular(idler) {
      if (!idler.length) return [];
      return hataKontrol(await db.from('ziyaret_bulgulari').select('*').in('ziyaret_id', idler).order('sira').order('created_at'));
    },
    async bulguEkle(b) {
      const son = await db.from('ziyaret_bulgulari').select('sira').eq('ziyaret_id', b.ziyaret_id).order('sira', { ascending: false }).limit(1);
      const sira = ((son.data?.[0] as { sira: number } | undefined)?.sira ?? 0) + 1;
      hataKontrol(await db.from('ziyaret_bulgulari').insert({ ...b, sira }).select('id').single());
    },
    async bulguGuncelle(id, alanlar) {
      hataKontrol(await db.from('ziyaret_bulgulari').update(alanlar).eq('id', id).select('id').single());
    },
    async bulguSil(id) {
      hataKontrol(await db.from('ziyaret_bulgulari').delete().eq('id', id).select('id').single());
    },
    async dosyalar(ziyaretId) {
      return hataKontrol(await db.from('ziyaret_dosyalari').select('*').eq('ziyaret_id', ziyaretId).order('created_at'));
    },
    async dosya(id) {
      return hataKontrol(await db.from('ziyaret_dosyalari').select('*').eq('id', id).maybeSingle());
    },
    async dosyaKaydet(d, veri) {
      const y = await db.storage.from('saha').upload(d.yol, veri, { contentType: d.mime, upsert: false });
      if (y.error) throw new Error(`Dosya yüklenemedi: ${y.error.message}`);
      const r = await db.from('ziyaret_dosyalari').insert(d).select('id').single();
      if (r.error) {
        await db.storage.from('saha').remove([d.yol]);
        throw new Error(`Veritabanı hatası: ${r.error.message}`);
      }
    },
    async dosyaIcerigi(yol) {
      const r = await db.storage.from('saha').download(yol);
      if (r.error || !r.data) throw new Error(`Dosya okunamadı: ${r.error?.message}`);
      return r.data.arrayBuffer();
    },
    async dosyaSil(id) {
      const d = hataKontrol(await db.from('ziyaret_dosyalari').select('yol').eq('id', id).single()) as { yol: string };
      hataKontrol(await db.from('ziyaret_dosyalari').delete().eq('id', id).select('id').single());
      await db.storage.from('saha').remove([d.yol]);
    },
    async gorevDurumu(id, durum) {
      const tamamlanma_zamani = durum === 'tamamlandi' ? new Date().toISOString() : null;
      hataKontrol(await db.from('gorevler').update({ durum, tamamlanma_zamani }).eq('id', id).select('id').single());
    },
    async takvimAnahtari(yenile = false) {
      const { data: u } = await db.auth.getUser();
      if (!u.user) throw new Error('Oturum yok');
      if (!yenile) {
        const mevcut = await db.from('takvim_anahtarlari').select('anahtar').eq('kullanici_id', u.user.id).maybeSingle();
        if (mevcut.data) return mevcut.data.anahtar;
      }
      const r = await db
        .from('takvim_anahtarlari')
        .upsert({ kullanici_id: u.user.id, anahtar: crypto.randomUUID() })
        .select('anahtar')
        .single();
      if (r.error) throw new Error(`Veritabanı hatası: ${r.error.message}`);
      return (r.data as { anahtar: string }).anahtar;
    },
  };
}
