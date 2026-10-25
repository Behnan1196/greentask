-- İşletme planları: plan, bağlı tesisler, Word sürümleri, plan haritası öğeleri, hata taraması bulguları.
-- Revizyon maddeleri ayrı tablo değil: görev olarak tutulur (gorevler.isletme_plani_id), böylece Benim İşlerim'e düşer.

create table public.isletme_planlari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  durum text not null default 'revizyonda' check (durum in ('taslak', 'revizyonda', 'sunuldu', 'onaylandi')),
  onayli_surum text,                     -- örn. "Eylül 2024"
  onay_tarihi date,
  sunum_tarihi date,                     -- planlanan Bakanlık sunumu
  hazirlayan_id uuid references public.profiller (id) on delete set null,
  notlar text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.plan_tesisleri (
  plan_id uuid not null references public.isletme_planlari (id) on delete cascade,
  tesis_id uuid not null references public.tesisler (id) on delete cascade,
  primary key (plan_id, tesis_id)
);

create table public.plan_surumleri (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.isletme_planlari (id) on delete cascade,
  dosya_adi text not null,
  yol text not null unique,              -- planlar kovasında
  boyut bigint not null,
  ozet jsonb not null default '{}'::jsonb,  -- sayfa/tablo/şekil sayısı vb.
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.plan_surumleri (plan_id, created_at desc);

-- Plan haritası: bölümler, tablolar, şekiller. "anahtar" numaradan bağımsız sabit kimliktir;
-- yeni sürüm yüklenince numara güncellenir, durum ve notlar korunur.
create table public.plan_ogeleri (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.isletme_planlari (id) on delete cascade,
  anahtar text not null,
  tur text not null check (tur in ('bolum', 'tablo', 'sekil')),
  icerik_turu text not null default 'metin' check (icerik_turu in ('metin', 'veri_tablosu', 'dis_belge', 'mevzuat_eki')),
  numara text,                           -- "Tablo 17", "5.D"
  ad text not null,
  bolum text,                            -- üst bölüm başlığı
  veri_kaynagi text,                     -- sistemden üretilebilecekse izleme türü (depo_gazi, sizinti_suyu…)
  durum text not null default 'degismedi' check (durum in ('degismedi', 'kontrol', 'guncellenecek', 'eklenecek', 'tamam')),
  notlar text,
  sira int not null default 0,
  son_gorulen_surum uuid references public.plan_surumleri (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (plan_id, anahtar)
);
create index on public.plan_ogeleri (plan_id, sira);

create table public.plan_bulgulari (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.isletme_planlari (id) on delete cascade,
  surum_id uuid not null references public.plan_surumleri (id) on delete cascade,
  kategori text not null,                -- dizin, numara, icerik, tutarlilik, yazim, guncellik
  onem text not null default 'orta' check (onem in ('yuksek', 'orta', 'dusuk')),
  baslik text not null,
  detay text,
  oneri text,
  durum text not null default 'acik' check (durum in ('acik', 'duzeltildi', 'yoksay')),
  sira int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.plan_bulgulari (surum_id, sira);

alter table public.gorevler
  add column isletme_plani_id uuid references public.isletme_planlari (id) on delete set null,
  add column plan_ogesi_id uuid references public.plan_ogeleri (id) on delete set null;
create index on public.gorevler (isletme_plani_id);

create trigger isletme_planlari_zaman before update on public.isletme_planlari
  for each row execute function public.zaman_damgasi();
create trigger plan_ogeleri_zaman before update on public.plan_ogeleri
  for each row execute function public.zaman_damgasi();

do $$
declare t text;
begin
  foreach t in array array['isletme_planlari', 'plan_tesisleri', 'plan_surumleri', 'plan_ogeleri', 'plan_bulgulari'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ekip_okur on public.%I for select to authenticated using (public.aktif_kullanici())', t);
    execute format('create policy ekip_ekler on public.%I for insert to authenticated with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_gunceller on public.%I for update to authenticated using (public.aktif_kullanici()) with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_siler on public.%I for delete to authenticated using (public.aktif_kullanici())', t);
  end loop;
end $$;

-- Word dosyaları için özel kova (planlar 10–50 MB olabilir; tarayıcıdan doğrudan yüklenir).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('planlar', 'planlar', false, 104857600)
    on conflict (id) do nothing;
    execute $p$create policy planlar_okur on storage.objects for select to authenticated
      using (bucket_id = 'planlar' and public.aktif_kullanici())$p$;
    execute $p$create policy planlar_yukler on storage.objects for insert to authenticated
      with check (bucket_id = 'planlar' and public.aktif_kullanici())$p$;
    execute $p$create policy planlar_siler on storage.objects for delete to authenticated
      using (bucket_id = 'planlar' and public.aktif_kullanici())$p$;
  end if;
end $$;
