-- Haftalık toplantı gündem maddeleri. Her madde bir karar taşır ve göreve dönüşebilir.

create table public.toplanti_maddeleri (
  id uuid primary key default gen_random_uuid(),
  toplanti_id uuid not null references public.toplantilar (id) on delete cascade,
  baslik text not null,
  karar text,
  tesis_id uuid references public.tesisler (id) on delete set null,
  tesis_yukumluluk_id uuid references public.tesis_yukumlulukleri (id) on delete set null,
  kaynak text not null default 'elle' check (kaynak in ('elle', 'sistem', 'mevzuat')),
  sira int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.toplanti_maddeleri (toplanti_id, sira);

alter table public.gorevler
  add column toplanti_maddesi_id uuid references public.toplanti_maddeleri (id) on delete set null;
create index on public.gorevler (toplanti_id);

create trigger toplanti_maddeleri_zaman before update on public.toplanti_maddeleri
  for each row execute function public.zaman_damgasi();

alter table public.toplanti_maddeleri enable row level security;
create policy ekip_okur on public.toplanti_maddeleri for select to authenticated using (public.aktif_kullanici());
create policy ekip_ekler on public.toplanti_maddeleri for insert to authenticated with check (public.aktif_kullanici());
create policy ekip_gunceller on public.toplanti_maddeleri for update to authenticated
  using (public.aktif_kullanici()) with check (public.aktif_kullanici());
create policy ekip_siler on public.toplanti_maddeleri for delete to authenticated using (public.aktif_kullanici());
