import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
const GOREV = "g.id, g.baslik, g.aciklama, g.sorumlu_id, to_char(g.son_tarih, 'YYYY-MM-DD') as son_tarih, g.durum, g.kaynak, g.tesis_id, g.toplanti_id, g.toplanti_maddesi_id, g.isletme_plani_id, g.plan_ogesi_id, g.created_at";
const TOPLANTI = "id, to_char(tarih, 'YYYY-MM-DD') as tarih, baslik, notlar, durum, created_at";
const ZIYARET = "id, tesis_id, to_char(tarih, 'YYYY-MM-DD') as tarih, ziyaretci_id, amac, durum, saha_notu, rapor_ozeti";
const BULGU = "id, ziyaret_id, bulgu, dayanak, onem, duzeltici_faaliyet, to_char(termin, 'YYYY-MM-DD') as termin, durum, gorev_id, dosya_id, sira";
const PLAN = `p.id, p.baslik, p.durum, p.onayli_surum, to_char(p.onay_tarihi, 'YYYY-MM-DD') as onay_tarihi,
  to_char(p.sunum_tarihi, 'YYYY-MM-DD') as sunum_tarihi, p.hazirlayan_id, p.notlar, p.created_at,
  coalesce((select array_agg(tesis_id::text) from plan_tesisleri pt where pt.plan_id = p.id), '{}') as tesis_idleri`;
const OGE = 'id, plan_id, anahtar, tur, icerik_turu, numara, ad, bolum, veri_kaynagi, durum, notlar, sira, son_gorulen_surum';
const DOSYA_DIZINI = () => process.env.GT_DEMO_DOSYA_DIZINI ?? '/tmp/gt-demo-dosyalar';

function guncelle(tablo: string, id: string, alanlar: object) {
  const k = Object.keys(alanlar);
  if (!k.length) return Promise.resolve([]);
  return q(`update ${tablo} set ${k.map((a, i) => `${a} = $${i + 2}`).join(', ')} where id = $1`, [
    id,
    ...k.map((a) => (alanlar as Record<string, unknown>)[a]),
  ]);
}

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
    async gorevler({ sorumluId, acik, toplantiId, toplantidan, isletmePlaniId }) {
      const kosul: string[] = [];
      const p: unknown[] = [];
      if (sorumluId) kosul.push(`sorumlu_id = $${p.push(sorumluId)}`);
      if (acik) kosul.push("durum in ('acik', 'devam')");
      if (toplantiId) kosul.push(`toplanti_id = $${p.push(toplantiId)}`);
      if (toplantidan) kosul.push('toplanti_id is not null');
      if (isletmePlaniId) kosul.push(`isletme_plani_id = $${p.push(isletmePlaniId)}`);
      return q(
        `select ${GOREV} from gorevler g ${kosul.length ? 'where ' + kosul.join(' and ') : ''} order by son_tarih nulls last, created_at`,
        p,
      );
    },
    async gorevEkle(g) {
      const r = await q<{ id: string }>(
        `insert into gorevler (baslik, aciklama, sorumlu_id, son_tarih, tesis_id, kaynak, toplanti_id, toplanti_maddesi_id, isletme_plani_id, plan_ogesi_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
        [g.baslik, g.aciklama, g.sorumlu_id, g.son_tarih, g.tesis_id, g.kaynak ?? 'elle', g.toplanti_id ?? null, g.toplanti_maddesi_id ?? null,
          g.isletme_plani_id ?? null, g.plan_ogesi_id ?? null],
      );
      return r[0].id;
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
    async ziyaretler(filtre = {}) {
      return filtre.tesisId
        ? q(`select ${ZIYARET} from saha_ziyaretleri where tesis_id = $1 order by tarih desc`, [filtre.tesisId])
        : q(`select ${ZIYARET} from saha_ziyaretleri order by tarih desc`);
    },
    async ziyaret(id) {
      return (await q<never>(`select ${ZIYARET} from saha_ziyaretleri where id = $1`, [id]))[0] ?? null;
    },
    async ziyaretOlustur(z) {
      return (
        await q<{ id: string }>('insert into saha_ziyaretleri (tesis_id, tarih, ziyaretci_id, amac) values ($1, $2, $3, $4) returning id', [
          z.tesis_id, z.tarih, z.ziyaretci_id, z.amac,
        ])
      )[0].id;
    },
    async ziyaretGuncelle(id, alanlar) {
      await guncelle('saha_ziyaretleri', id, alanlar);
    },
    async bulgular(idler) {
      if (!idler.length) return [];
      return q(`select ${BULGU} from ziyaret_bulgulari where ziyaret_id = any($1::uuid[]) order by sira, created_at`, [idler]);
    },
    async bulguEkle(b) {
      await q(
        `insert into ziyaret_bulgulari (ziyaret_id, bulgu, dayanak, onem, duzeltici_faaliyet, termin, dosya_id, sira)
         values ($1, $2, $3, $4, $5, $6, $7, coalesce((select max(sira) from ziyaret_bulgulari where ziyaret_id = $1), 0) + 1)`,
        [b.ziyaret_id, b.bulgu, b.dayanak, b.onem, b.duzeltici_faaliyet, b.termin, b.dosya_id],
      );
    },
    async bulguGuncelle(id, alanlar) {
      await guncelle('ziyaret_bulgulari', id, alanlar);
    },
    async bulguSil(id) {
      await q('delete from ziyaret_bulgulari where id = $1', [id]);
    },
    async dosyalar(ziyaretId) {
      return q('select * from ziyaret_dosyalari where ziyaret_id = $1 order by created_at', [ziyaretId]);
    },
    async dosya(id) {
      return (await q<never>('select * from ziyaret_dosyalari where id = $1', [id]))[0] ?? null;
    },
    async dosyaKaydet(d, veri) {
      const hedef = path.join(DOSYA_DIZINI(), d.yol);
      await mkdir(path.dirname(hedef), { recursive: true });
      await writeFile(hedef, Buffer.from(veri));
      await q('insert into ziyaret_dosyalari (ziyaret_id, tur, yol, mime, boyut, aciklama) values ($1, $2, $3, $4, $5, $6)', [
        d.ziyaret_id, d.tur, d.yol, d.mime, d.boyut, d.aciklama,
      ]);
    },
    async dosyaIcerigi(yol) {
      const b = await readFile(path.join(DOSYA_DIZINI(), yol));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    },
    async dosyaSil(id) {
      const r = await q<{ yol: string }>('delete from ziyaret_dosyalari where id = $1 returning yol', [id]);
      if (r[0]) await rm(path.join(DOSYA_DIZINI(), r[0].yol), { force: true });
    },
    async planlar() {
      return q(`select ${PLAN} from isletme_planlari p order by created_at desc`);
    },
    async plan(id) {
      return (await q<never>(`select ${PLAN} from isletme_planlari p where id = $1`, [id]))[0] ?? null;
    },
    async planOlustur(p, tesisIdleri) {
      const id = (
        await q<{ id: string }>(
          `insert into isletme_planlari (baslik, durum, onayli_surum, onay_tarihi, sunum_tarihi, hazirlayan_id, notlar)
           values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [p.baslik, p.durum, p.onayli_surum, p.onay_tarihi, p.sunum_tarihi, p.hazirlayan_id, p.notlar],
        )
      )[0].id;
      await q('insert into plan_tesisleri (plan_id, tesis_id) select $1, unnest($2::uuid[])', [id, tesisIdleri]);
      return id;
    },
    async planGuncelle(id, alanlar, tesisIdleri) {
      await guncelle('isletme_planlari', id, alanlar);
      if (tesisIdleri) {
        await q('delete from plan_tesisleri where plan_id = $1', [id]);
        await q('insert into plan_tesisleri (plan_id, tesis_id) select $1, unnest($2::uuid[])', [id, tesisIdleri]);
      }
    },
    async planSurumleri(planId) {
      return q('select * from plan_surumleri where plan_id = $1 order by created_at desc', [planId]);
    },
    async planSurumu(id) {
      return (await q<never>('select * from plan_surumleri where id = $1', [id]))[0] ?? null;
    },
    async planYuklemeHedefi(yol) {
      return { url: `/api/planlar/yerel-yukle?yol=${encodeURIComponent(yol)}`, yontem: 'PUT' as const };
    },
    async planDosyasi(yol) {
      const b = await readFile(path.join(DOSYA_DIZINI(), 'planlar', yol));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    },
    async planIndirmeAdresi() {
      return null;
    },
    async planDosyasiSil(yol) {
      await rm(path.join(DOSYA_DIZINI(), 'planlar', yol), { force: true });
    },
    async surumKaydet(s, ogeler, bulgular) {
      const istemci = await pool().connect();
      try {
        await istemci.query('begin');
        const surumId = (
          await istemci.query('insert into plan_surumleri (plan_id, dosya_adi, yol, boyut, ozet) values ($1, $2, $3, $4, $5) returning id', [
            s.plan_id, s.dosya_adi, s.yol, s.boyut, s.ozet,
          ])
        ).rows[0].id as string;
        await istemci.query(
          `insert into plan_ogeleri (plan_id, anahtar, tur, icerik_turu, numara, ad, bolum, veri_kaynagi, sira, son_gorulen_surum)
           select $1, x.anahtar, x.tur, x.icerik_turu, x.numara, x.ad, x.bolum, x.veri_kaynagi, x.sira, $2
           from jsonb_to_recordset($3::jsonb) as x(anahtar text, tur text, icerik_turu text, numara text, ad text, bolum text, veri_kaynagi text, sira int)
           on conflict (plan_id, anahtar) do update set tur = excluded.tur, icerik_turu = excluded.icerik_turu, numara = excluded.numara,
             ad = excluded.ad, bolum = excluded.bolum, veri_kaynagi = excluded.veri_kaynagi, sira = excluded.sira,
             son_gorulen_surum = excluded.son_gorulen_surum`,
          [s.plan_id, surumId, JSON.stringify(ogeler)],
        );
        await istemci.query(
          `insert into plan_bulgulari (plan_id, surum_id, kategori, onem, baslik, detay, oneri, durum, sira)
           select $1, $2, x.kategori, x.onem, x.baslik, x.detay, x.oneri, coalesce(x.durum, 'acik'), x.sira
           from jsonb_to_recordset($3::jsonb) as x(kategori text, onem text, baslik text, detay text, oneri text, durum text, sira int)`,
          [s.plan_id, surumId, JSON.stringify(bulgular.map((b, i) => ({ ...b, sira: i + 1 })))],
        );
        await istemci.query('commit');
        return surumId;
      } catch (e) {
        await istemci.query('rollback');
        throw e;
      } finally {
        istemci.release();
      }
    },
    async planOgeleri(planId) {
      return q(`select ${OGE} from plan_ogeleri where plan_id = $1 order by sira`, [planId]);
    },
    async ogeGuncelle(id, alanlar) {
      await guncelle('plan_ogeleri', id, alanlar);
    },
    async planBulgulari(surumId) {
      return q('select id, plan_id, surum_id, kategori, onem, baslik, detay, oneri, durum, sira from plan_bulgulari where surum_id = $1 order by sira', [surumId]);
    },
    async planBulgusuGuncelle(id, durum) {
      await q('update plan_bulgulari set durum = $2 where id = $1', [id, durum]);
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

/** Demo modunda tarayıcıdan gelen plan dosyasını yerel diske yazar (Supabase imzalı yüklemenin karşılığı). */
export async function demoPlanDosyasiYaz(yol: string, veri: ArrayBuffer) {
  const hedef = path.join(DOSYA_DIZINI(), 'planlar', yol);
  await mkdir(path.dirname(hedef), { recursive: true });
  await writeFile(hedef, Buffer.from(veri));
}
