-- Greentask İş Sistemi — temel şema (v1)
-- Tek doğru kaynak: tesisler, yükümlülükler, olaylar, izleme kayıtları, mevzuat, toplantı/görev.
-- Termin hesabı (kalan gün, durum) uygulamadaki kural motorunda yapılır (src/lib/termin);
-- veritabanı yalnızca girdileri (tarihler, olaylar, parametreler) tutar.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipler
-- ---------------------------------------------------------------------------
create type public.kural_tipi as enum (
  'bitis_tarihi',        -- belge bitiş tarihinden geriye aşamalar (GFB, MSS, kapasite, EAYP, BKKR, sıfır atık)
  'son_islem_periyot',   -- son işlem + periyot (emisyon, atıksu numune, depo gazı, sızıntı suyu, gözlem kuyusu)
  'sozlesme_takvimi',    -- sözleşme tarihine bağlı yıllık seri (iç tetkik, eğitim)
  'yenilenen_sozlesme',  -- süreli / otomatik yenilenen sözleşme (bitkisel atık yağ, tıbbi atık)
  'donemsel_rapor',      -- başlangıçtan itibaren dönem dönem rapor sunumu (ÇED izleme)
  'yillik_sabit_tarih'   -- her yıl aynı gün (atık beyanı vb.)
);

create type public.cezai_risk as enum ('yok', 'dusuk', 'var', 'yuksek');
create type public.kayit_durumu as enum ('aktif', 'muaf', 'kapsam_disi', 'beklemede');
create type public.kullanici_rolu as enum ('yonetici', 'muhendis');
create type public.gorev_durumu as enum ('acik', 'devam', 'tamamlandi', 'iptal');
create type public.olay_turu as enum (
  'gerceklesti', 'sunuldu', 'eksiklik_geldi', 'eksiklik_yanitlandi', 'onaylandi', 'not'
);

-- ---------------------------------------------------------------------------
-- Ortak tetikleyici: updated_at / updated_by
-- ---------------------------------------------------------------------------
create or replace function public.zaman_damgasi()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Kullanıcılar
-- ---------------------------------------------------------------------------
create table public.profiller (
  id uuid primary key references auth.users (id) on delete cascade,
  ad_soyad text not null default '',
  eposta text,
  rol public.kullanici_rolu not null default 'muhendis',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Supabase Auth'a eklenen her kullanıcı için profil satırı açılır.
create or replace function public.yeni_kullanici()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, eposta, ad_soyad)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'ad_soyad', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger auth_kullanici_eklendi
  after insert on auth.users
  for each row execute function public.yeni_kullanici();

create or replace function public.aktif_kullanici()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and aktif);
$$;

create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiller where id = auth.uid() and aktif and rol = 'yonetici');
$$;

-- ---------------------------------------------------------------------------
-- Tesisler ve kişiler
-- ---------------------------------------------------------------------------
create table public.sektor_gruplari (
  kod text primary key,              -- G1..G10
  ad text not null,
  aciklama text
);

create table public.tesisler (
  id uuid primary key default gen_random_uuid(),
  gt_kod text not null unique check (gt_kod ~ '^GT-[0-9]{3}$'),
  kisa_ad text not null,
  resmi_unvan text,
  il text,
  sinif text,                         -- EK-1 / Ek-2 / Kapsamdışı
  nace_kodlari text,
  grup_kod text references public.sektor_gruplari (kod),
  grup_notu text,                     -- örn. "G5 (+G2/G3)"
  firma_grubu text,                   -- örn. "Panda Grup"
  ad_varyantlari text[] not null default '{}',
  sozlesme_tarihi date,
  sozlesme_kapsami text,
  izin_lisans_konusu text,
  mevzuat_notu text,
  notlar text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.kisiler (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid not null references public.tesisler (id) on delete cascade,
  ad_soyad text not null,
  gorev text,
  sorumluluklar text,
  telefon text,
  eposta text,
  imza_yetkisi boolean not null default false,
  profil_notu text,                   -- nasıl biridir, neyi önemser, ziyarette ne lazım
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.kisiler (tesis_id);

-- ---------------------------------------------------------------------------
-- Yükümlülükler (kural kataloğu + tesis bazlı kayıtlar + olaylar)
-- ---------------------------------------------------------------------------
create table public.yukumluluk_turleri (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,           -- 'mss', 'gfb_izin', ...
  ad text not null,
  kural_tipi public.kural_tipi not null,
  parametreler jsonb not null default '{}'::jsonb,
  cezai_risk public.cezai_risk not null default 'dusuk',
  hedef_klasor text,                  -- 24'lük klasör yapısındaki yeri
  mevzuat_dayanagi text,
  aciklama text,
  sira int not null default 100,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.tesis_yukumlulukleri (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid references public.tesisler (id) on delete cascade,
  tur_id uuid not null references public.yukumluluk_turleri (id),
  etiket text not null default '',    -- aynı türden birden çok kayıt: "Elektrik üretim", ÇED proje adı
  durum public.kayit_durumu not null default 'aktif',
  gecerlilik_bitis date,              -- bitis_tarihi kuralları
  belge_tarihi date,                  -- belge düzenlenme tarihi (bitiş = belge + geçerlilik)
  son_islem date,                     -- son_islem_periyot kuralları
  baslangic date,                     -- sözleşme / izleme başlangıcı
  parametreler jsonb not null default '{}'::jsonb,  -- türün parametrelerini tesis bazında ezer
  sorumlu_id uuid references public.profiller (id) on delete set null,
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint tesis_veya_etiket check (tesis_id is not null or etiket <> ''),
  constraint tesis_yukumluluk_tekil unique nulls not distinct (tesis_id, tur_id, etiket)
);
create index on public.tesis_yukumlulukleri (tesis_id);
create index on public.tesis_yukumlulukleri (tur_id);

create table public.yukumluluk_olaylari (
  id uuid primary key default gen_random_uuid(),
  tesis_yukumluluk_id uuid not null references public.tesis_yukumlulukleri (id) on delete cascade,
  tarih date not null,
  tur public.olay_turu not null,
  aciklama text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.yukumluluk_olaylari (tesis_yukumluluk_id, tarih);

-- ---------------------------------------------------------------------------
-- İzleme kayıtları (yüksek hacimli loglar)
-- ---------------------------------------------------------------------------
create table public.izleme_kayitlari (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid not null references public.tesisler (id) on delete cascade,
  tur text not null check (tur in ('depo_gazi', 'sizinti_suyu', 'gozlem_kuyusu', 'atiksu_numune', 'vidanjor', 'emisyon')),
  donem text,                         -- "2026-01", "2026-Q1", "2026-H1"
  numune_noktasi text,
  tarih date,
  laboratuvar text,
  rapor_no text,
  makbuz_dosyada boolean,
  sonuc_uygun boolean,
  degerler jsonb not null default '{}'::jsonb,
  aciklama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.izleme_kayitlari (tesis_id, tur, tarih);

-- ---------------------------------------------------------------------------
-- Mevzuat
-- ---------------------------------------------------------------------------
create table public.mevzuat (
  id uuid primary key default gen_random_uuid(),
  kategori text,
  tur text,
  ad text not null,
  rg_metin text,                      -- "09.07.2025 / 32951" (ham)
  rg_tarih date,
  rg_sayi text,
  teyit_gerekli boolean not null default false,
  kapsam_notu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.mevzuat_matrisi (
  mevzuat_id uuid not null references public.mevzuat (id) on delete cascade,
  grup_kod text not null references public.sektor_gruplari (kod),
  uygulama text not null check (uygulama in ('X', 'K')),  -- X: doğrudan, K: koşullu
  primary key (mevzuat_id, grup_kod)
);

create table public.mevzuat_degisiklikleri (
  id uuid primary key default gen_random_uuid(),
  tespit_tarihi date not null,
  rg_metin text,
  tur text,
  ad text not null,
  ozet text,
  etkilenen_gruplar text,
  etkilenen_tesisler text,
  aksiyon text,
  durum text not null default 'acik' check (durum in ('acik', 'kapali')),
  mevzuat_id uuid references public.mevzuat (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- Toplantılar ve görevler
-- ---------------------------------------------------------------------------
create table public.toplantilar (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  baslik text not null default 'Haftalık büro toplantısı',
  notlar text,
  durum text not null default 'acik' check (durum in ('acik', 'kapandi')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.gorevler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  sorumlu_id uuid references public.profiller (id) on delete set null,
  son_tarih date,
  durum public.gorev_durumu not null default 'acik',
  kaynak text not null default 'elle' check (kaynak in ('elle', 'toplanti', 'termin', 'saha', 'isletme_plani', 'mevzuat')),
  toplanti_id uuid references public.toplantilar (id) on delete set null,
  tesis_id uuid references public.tesisler (id) on delete set null,
  tesis_yukumluluk_id uuid references public.tesis_yukumlulukleri (id) on delete set null,
  tamamlanma_zamani timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.gorevler (sorumlu_id, durum);

-- ---------------------------------------------------------------------------
-- updated_at tetikleyicileri
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tesisler','kisiler','yukumluluk_turleri','tesis_yukumlulukleri',
                           'izleme_kayitlari','mevzuat','mevzuat_degisiklikleri','toplantilar','gorevler']
  loop
    execute format('create trigger %I_zaman before update on public.%I for each row execute function public.zaman_damgasi()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Satır düzeyi güvenlik: yalnızca aktif ekip üyeleri; kural kataloğu ve roller yöneticide
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sektor_gruplari','tesisler','kisiler','yukumluluk_turleri','tesis_yukumlulukleri',
                           'yukumluluk_olaylari','izleme_kayitlari','mevzuat','mevzuat_matrisi',
                           'mevzuat_degisiklikleri','toplantilar','gorevler','profiller']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ekip_okur on public.%I for select to authenticated using (public.aktif_kullanici())', t);
  end loop;

  -- ekip yazabilir
  foreach t in array array['tesisler','kisiler','tesis_yukumlulukleri','yukumluluk_olaylari','izleme_kayitlari',
                           'mevzuat','mevzuat_matrisi','mevzuat_degisiklikleri','toplantilar','gorevler']
  loop
    execute format('create policy ekip_ekler on public.%I for insert to authenticated with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_gunceller on public.%I for update to authenticated using (public.aktif_kullanici()) with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_siler on public.%I for delete to authenticated using (public.aktif_kullanici())', t);
  end loop;

  -- yalnızca yönetici yazar
  foreach t in array array['sektor_gruplari','yukumluluk_turleri','profiller']
  loop
    execute format('create policy yonetici_yazar on public.%I for all to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi())', t);
  end loop;
end $$;

-- Kullanıcı kendi adını güncelleyebilir (rolünü değil).
create policy kendi_profilini_gunceller on public.profiller
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol = (select p.rol from public.profiller p where p.id = auth.uid()));
