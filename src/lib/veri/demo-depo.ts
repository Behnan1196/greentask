import 'server-only';
import { Pool } from 'pg';
import type { Depo, Kullanici, TakvimVerisi } from './tipler';

// YALNIZCA GELİŞTİRME: Supabase hesabı olmadan, Excel'den üretilen seed ile yüklü yerel bir
// Postgres üzerinde uygulamayı denemek için. Oturum açma yoktur; production'da asla kullanılmaz.

const DEMO_KULLANICI: Kullanici = { id: '00000000-0000-0000-0000-000000000000', ad_soyad: 'Demo kullanıcı', eposta: null, rol: 'yonetici' };

/** Demo kullanıcı: veritabanındaki ilk yönetici (yoksa sahte kullanıcı). */
async function demoKullanici(): Promise<Kullanici> {
  const r = await q<Kullanici>("select id, ad_soyad, eposta, rol from profiller where aktif and rol = 'yonetici' order by created_at limit 1");
  return r[0] ?? DEMO_KULLANICI;
}

let havuz: Pool | null = null;
function pool() {
  // tarih sütunları metin olarak gelsin (saat dilimi kayması olmasın)
  havuz ??= new Pool({ connectionString: process.env.GT_DEMO_DB_URL });
  return havuz;
}

const TARIH_ALANLARI = ['son_tarih', 'tarih', 'tespit_tarihi', 'gecerlilik_bitis', 'belge_tarihi', 'son_islem', 'baslangic', 'sozlesme_tarihi'];
const tarihSql = (tablo: string, sutunlar: string[]) =>
  sutunlar.map((s) => (TARIH_ALANLARI.includes(s) ? `to_char(${tablo}.${s}, 'YYYY-MM-DD') as ${s}` : `${tablo}.${s}`)).join(', ');

async function q<T>(sql: string, p: unknown[] = []): Promise<T[]> {
  return (await pool().query(sql, p)).rows as T[];
}

const TESIS = ['id', 'gt_kod', 'kisa_ad', 'resmi_unvan', 'il', 'sinif', 'nace_kodlari', 'grup_kod', 'grup_notu', 'firma_grubu',
  'sozlesme_tarihi', 'sozlesme_kapsami', 'izin_lisans_konusu', 'mevzuat_notu', 'notlar', 'aktif', 'sorumlu_id'];
const GOREV = "g.id, g.baslik, g.aciklama, g.sorumlu_id, to_char(g.son_tarih, 'YYYY-MM-DD') as son_tarih, g.durum, g.kaynak, g.tesis_id, g.toplanti_id, g.toplanti_maddesi_id, g.created_at";
const TOPLANTI = "id, to_char(tarih, 'YYYY-MM-DD') as tarih, baslik, notlar, durum, created_at";
const TY = ['id', 'tesis_id', 'tur_id', 'etiket', 'durum', 'gecerlilik_bitis', 'belge_tarihi', 'son_islem', 'baslangic',
  'parametreler', 'sorumlu_id', 'notlar'];

export function demoDepo(): Depo {
  return {
    async kullanici() {
      return demoKullanici();
    },
    async tesisler() {
      return q(`select ${tarihSql('t', TESIS)} from tesisler t where aktif order by gt_kod`);
    },
    async tesis(gtKod) {
      return (await q(`select ${tarihSql('t', TESIS)} from tesisler t where gt_kod = $1`, [gtKod]))[0] as never ?? null;
    },
    async kisiler(tesisId) {
      return q('select * from kisiler where tesis_id = $1 order by ad_soyad', [tesisId]);
    },
    async turler() {
      return q('select * from yukumluluk_turleri where aktif order by sira');
    },
    async yukumlulukler(tesisId) {
      const s = `select ${tarihSql('y', TY)} from tesis_yukumlulukleri y`;
      return tesisId ? q(`${s} where tesis_id = $1`, [tesisId]) : q(s);
    },
    async olaylar(idler) {
      const s = `select o.id, o.tesis_yukumluluk_id, to_char(o.tarih, 'YYYY-MM-DD') as tarih, o.tur, o.aciklama from yukumluluk_olaylari o`;
      return idler ? q(`${s} where tesis_yukumluluk_id = any($1::uuid[]) order by tarih`, [idler]) : q(`${s} order by tarih`);
    },
    async mevzuatDegisiklikleri() {
      return q(`select id, to_char(tespit_tarihi, 'YYYY-MM-DD') as tespit_tarihi, rg_metin, tur, ad, ozet, etkilenen_gruplar,
                       etkilenen_tesisler, aksiyon, durum from mevzuat_degisiklikleri order by tespit_tarihi desc`);
    },
    async yukumlulukGuncelle(id, alanlar) {
      const anahtarlar = Object.keys(alanlar);
      if (!anahtarlar.length) return;
      const set = anahtarlar.map((k, i) => `${k} = $${i + 2}`).join(', ');
      await q(`update tesis_yukumlulukleri set ${set} where id = $1`, [id, ...anahtarlar.map((k) => (alanlar as Record<string, unknown>)[k])]);
    },
    async olayEkle(o) {
      await q('insert into yukumluluk_olaylari (tesis_yukumluluk_id, tarih, tur, aciklama) values ($1, $2, $3, $4)', [
        o.tesis_yukumluluk_id, o.tarih, o.tur, o.aciklama,
      ]);
    },
    async olaySil(id) {
      await q('delete from yukumluluk_olaylari where id = $1', [id]);
    },
    async kullanicilar() {
      return q('select id, ad_soyad, eposta, rol from profiller where aktif order by ad_soyad');
    },
    async tesisSorumlusuAta(tesisId, kullaniciId) {
      await q('update tesisler set sorumlu_id = $2 where id = $1', [tesisId, kullaniciId]);
    },
    async gorevler({ sorumluId, acik, toplantiId, toplantidan }) {
      const kosul: string[] = [];
      const p: unknown[] = [];
      if (sorumluId) kosul.push(`sorumlu_id = $${p.push(sorumluId)}`);
      if (acik) kosul.push("durum in ('acik', 'devam')");
      if (toplantiId) kosul.push(`toplanti_id = $${p.push(toplantiId)}`);
      if (toplantidan) kosul.push('toplanti_id is not null');
      return q(
        `select ${GOREV} from gorevler g ${kosul.length ? 'where ' + kosul.join(' and ') : ''} order by son_tarih nulls last, created_at`,
        p,
      );
    },
    async gorevEkle(g) {
      await q(
        'insert into gorevler (baslik, aciklama, sorumlu_id, son_tarih, tesis_id, kaynak, toplanti_id, toplanti_maddesi_id) values ($1, $2, $3, $4, $5, $6, $7, $8)',
        [g.baslik, g.aciklama, g.sorumlu_id, g.son_tarih, g.tesis_id, g.kaynak ?? 'elle', g.toplanti_id ?? null, g.toplanti_maddesi_id ?? null],
      );
    },
    async toplantilar() {
      return q(`select ${TOPLANTI} from toplantilar order by tarih desc, created_at desc`);
    },
    async toplanti(id) {
      return (await q<never>(`select ${TOPLANTI} from toplantilar where id = $1`, [id]))[0] ?? null;
    },
    async toplantiOlustur(t) {
      return (await q<{ id: string }>('insert into toplantilar (tarih, baslik) values ($1, $2) returning id', [t.tarih, t.baslik]))[0].id;
    },
    async toplantiGuncelle(id, alanlar) {
      const k = Object.keys(alanlar);
      if (!k.length) return;
      await q(`update toplantilar set ${k.map((a, i) => `${a} = $${i + 2}`).join(', ')} where id = $1`, [id, ...k.map((a) => (alanlar as Record<string, unknown>)[a])]);
    },
    async maddeler(toplantiId) {
      return q('select id, toplanti_id, baslik, karar, tesis_id, tesis_yukumluluk_id, kaynak, sira from toplanti_maddeleri where toplanti_id = $1 order by sira, created_at', [toplantiId]);
    },
    async maddeEkle(m) {
      await q(
        `insert into toplanti_maddeleri (toplanti_id, baslik, karar, tesis_id, tesis_yukumluluk_id, kaynak, sira)
         values ($1, $2, $3, $4, $5, $6, coalesce((select max(sira) from toplanti_maddeleri where toplanti_id = $1), 0) + 1)`,
        [m.toplanti_id, m.baslik, m.karar ?? null, m.tesis_id ?? null, m.tesis_yukumluluk_id ?? null, m.kaynak],
      );
    },
    async maddeGuncelle(id, alanlar) {
      const k = Object.keys(alanlar);
      if (!k.length) return;
      await q(`update toplanti_maddeleri set ${k.map((a, i) => `${a} = $${i + 2}`).join(', ')} where id = $1`, [id, ...k.map((a) => (alanlar as Record<string, unknown>)[a])]);
    },
    async maddeSil(id) {
      await q('delete from toplanti_maddeleri where id = $1', [id]);
    },
    async gorevDurumu(id, durum) {
      await q("update gorevler set durum = $2::gorev_durumu, tamamlanma_zamani = case when $2::text = 'tamamlandi' then now() else null end where id = $1", [id, durum]);
    },
    async takvimAnahtari(yenile = false) {
      const k = await demoKullanici();
      if (!yenile) {
        const r = await q<{ anahtar: string }>('select anahtar from takvim_anahtarlari where kullanici_id = $1', [k.id]);
        if (r[0]) return r[0].anahtar;
      }
      const r = await q<{ anahtar: string }>(
        'insert into takvim_anahtarlari (kullanici_id) values ($1) on conflict (kullanici_id) do update set anahtar = gen_random_uuid() returning anahtar',
        [k.id],
      );
      return r[0].anahtar;
    },
  };
}

/** Demo modunda takvim aboneliği verisi (Supabase'deki takvim_verisi fonksiyonunun karşılığı). */
export async function demoTakvimVerisi(anahtar: string): Promise<TakvimVerisi | null> {
  const r = await q<{ v: TakvimVerisi | null }>('select takvim_verisi($1::uuid) as v', [anahtar]);
  return r[0]?.v ?? null;
}
