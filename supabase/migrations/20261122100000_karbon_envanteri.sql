-- Kurumsal sera gazı envanteri (TS EN ISO 14064-1:2018): envanter, faaliyet verileri, kilitli dönem ve denetim izi.
-- Hesap uygulamada (src/lib/karbon/motor.ts) yapılır; kilitlenen envanterin sonucu motor sürümüyle birlikte saklanır.

create table public.karbon_envanterleri (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid not null references public.tesisler (id) on delete restrict,
  yil int not null check (yil between 2000 and 2100),
  baz_yil int check (baz_yil between 2000 and 2100),  -- ISO 14064-1 madde 6.4.1; boşsa bu envanter yılı
  baslik text not null,
  sinir_yaklasimi text not null default 'operasyonel_kontrol'
    check (sinir_yaklasimi in ('operasyonel_kontrol', 'finansal_kontrol', 'hisse_payi')),
  sinir_aciklamasi text,          -- dahil edilen tesisler, faaliyetler
  haric_tutulanlar text,          -- hariç tutulan kaynaklar ve gerekçesi (ISO 14064-1 madde 5.2.3)
  gwp text not null default 'AR5' check (gwp in ('AR5', 'AR6')),
  yakit_wtt boolean not null default true,
  durum text not null default 'taslak' check (durum in ('taslak', 'kilitli')),
  kilit_sonucu jsonb,             -- kilitlenme anındaki hesap sonucu (motor sürümü dahil)
  kilit_zamani timestamptz,
  kilitleyen uuid,
  hazirlayan_id uuid references public.profiller (id) on delete set null,
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (tesis_id, yil, baslik)
);

create table public.karbon_faaliyetleri (
  id uuid primary key default gen_random_uuid(),
  envanter_id uuid not null references public.karbon_envanterleri (id) on delete cascade,
  veri jsonb not null,            -- motorun Faaliyet tipi (id hariç)
  kanit text,                     -- fatura no, sayaç, belge adı: verinin dayanağı
  sira int not null default 100,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.karbon_faaliyetleri (envanter_id, sira);

create table public.karbon_denetim_izi (
  id bigint generated always as identity primary key,
  envanter_id uuid not null references public.karbon_envanterleri (id) on delete cascade,
  zaman timestamptz not null default now(),
  kullanici_id uuid default auth.uid(),
  islem text not null,            -- faaliyet_ekle, faaliyet_guncelle, faaliyet_sil, kilitle, kilit_ac, ayar
  faaliyet_id uuid,
  onceki jsonb,
  sonraki jsonb
);
create index on public.karbon_denetim_izi (envanter_id, zaman desc);

create trigger karbon_envanterleri_zaman before update on public.karbon_envanterleri
  for each row execute function public.zaman_damgasi();
create trigger karbon_faaliyetleri_zaman before update on public.karbon_faaliyetleri
  for each row execute function public.zaman_damgasi();

-- Kilitli envanterin faaliyet verisi değiştirilemez; her değişiklik denetim izine yazılır.
create or replace function public.karbon_faaliyet_izi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  env uuid := coalesce(new.envanter_id, old.envanter_id);
  d text;
begin
  select durum into d from public.karbon_envanterleri where id = env;
  if d is null then
    return coalesce(new, old);  -- envanter silinirken (cascade) iz tutulmaz
  end if;
  if d = 'kilitli' then
    raise exception 'Envanter kilitli: faaliyet verisi değiştirilemez';
  end if;
  insert into public.karbon_denetim_izi (envanter_id, islem, faaliyet_id, onceki, sonraki)
  values (
    env,
    case tg_op when 'INSERT' then 'faaliyet_ekle' when 'UPDATE' then 'faaliyet_guncelle' else 'faaliyet_sil' end,
    coalesce(new.id, old.id),
    case when tg_op <> 'INSERT' then jsonb_build_object('veri', old.veri, 'kanit', old.kanit) end,
    case when tg_op <> 'DELETE' then jsonb_build_object('veri', new.veri, 'kanit', new.kanit) end
  );
  return coalesce(new, old);
end $$;

create trigger karbon_faaliyetleri_iz after insert or update or delete on public.karbon_faaliyetleri
  for each row execute function public.karbon_faaliyet_izi();

-- Envanter ayarı ve kilit değişiklikleri de ize girer; kilitli envanterde yalnızca kilit açılabilir.
create or replace function public.karbon_envanter_izi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.durum = 'kilitli' and new.durum = 'kilitli' then
    raise exception 'Envanter kilitli: önce kilit açılmalı';
  end if;
  if old.durum = 'kilitli' and new.durum = 'taslak' and not public.yonetici_mi() then
    raise exception 'Kilidi yalnızca yönetici açabilir';
  end if;
  insert into public.karbon_denetim_izi (envanter_id, islem, onceki, sonraki)
  values (
    new.id,
    case when old.durum <> new.durum then (case new.durum when 'kilitli' then 'kilitle' else 'kilit_ac' end) else 'ayar' end,
    to_jsonb(old) - 'kilit_sonucu' - 'updated_at' - 'updated_by',
    to_jsonb(new) - 'kilit_sonucu' - 'updated_at' - 'updated_by'
  );
  return new;
end $$;

create trigger karbon_envanterleri_iz before update on public.karbon_envanterleri
  for each row execute function public.karbon_envanter_izi();

create or replace function public.karbon_envanter_silme()
returns trigger language plpgsql as $$
begin
  if old.durum = 'kilitli' then
    raise exception 'Kilitli envanter silinemez';
  end if;
  return old;
end $$;

create trigger karbon_envanterleri_silme before delete on public.karbon_envanterleri
  for each row execute function public.karbon_envanter_silme();

do $$
declare t text;
begin
  foreach t in array array['karbon_envanterleri', 'karbon_faaliyetleri'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ekip_okur on public.%I for select to authenticated using (public.aktif_kullanici())', t);
    execute format('create policy ekip_ekler on public.%I for insert to authenticated with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_gunceller on public.%I for update to authenticated using (public.aktif_kullanici()) with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_siler on public.%I for delete to authenticated using (public.aktif_kullanici())', t);
  end loop;
end $$;

-- Denetim izi yalnızca okunur; yazma tetikleyicilerle yapılır.
alter table public.karbon_denetim_izi enable row level security;
create policy ekip_okur on public.karbon_denetim_izi for select to authenticated using (public.aktif_kullanici());
