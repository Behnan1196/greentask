-- Saha ziyaretleri: planlama, sahadan dosyalar (foto/ses), bulgular ve rapor.

create table public.saha_ziyaretleri (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid not null references public.tesisler (id) on delete cascade,
  tarih date not null,
  ziyaretci_id uuid references public.profiller (id) on delete set null,
  amac text,                       -- iç tetkik, eğitim, denetim hazırlığı, rutin…
  durum text not null default 'planli' check (durum in ('planli', 'yapildi', 'raporlandi', 'iptal')),
  saha_notu text,
  rapor_ozeti text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.saha_ziyaretleri (tesis_id, tarih desc);
create index on public.saha_ziyaretleri (ziyaretci_id, tarih);

create table public.ziyaret_bulgulari (
  id uuid primary key default gen_random_uuid(),
  ziyaret_id uuid not null references public.saha_ziyaretleri (id) on delete cascade,
  bulgu text not null,
  dayanak text,                    -- mevzuat maddesi
  onem text not null default 'orta' check (onem in ('yuksek', 'orta', 'dusuk', 'uygun')),
  duzeltici_faaliyet text,
  termin date,
  durum text not null default 'acik' check (durum in ('acik', 'kapandi')),
  gorev_id uuid references public.gorevler (id) on delete set null,
  dosya_id uuid,                   -- kanıt fotoğrafı (ziyaret_dosyalari)
  sira int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index on public.ziyaret_bulgulari (ziyaret_id, sira);

create table public.ziyaret_dosyalari (
  id uuid primary key default gen_random_uuid(),
  ziyaret_id uuid not null references public.saha_ziyaretleri (id) on delete cascade,
  tur text not null check (tur in ('foto', 'ses', 'belge')),
  yol text not null unique,        -- depolamadaki yol: <ziyaret_id>/<dosya>
  mime text not null,
  boyut int not null,
  aciklama text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.ziyaret_dosyalari (ziyaret_id, created_at);

alter table public.ziyaret_bulgulari
  add constraint ziyaret_bulgulari_dosya_fk foreign key (dosya_id) references public.ziyaret_dosyalari (id) on delete set null;

create trigger saha_ziyaretleri_zaman before update on public.saha_ziyaretleri
  for each row execute function public.zaman_damgasi();
create trigger ziyaret_bulgulari_zaman before update on public.ziyaret_bulgulari
  for each row execute function public.zaman_damgasi();

do $$
declare t text;
begin
  foreach t in array array['saha_ziyaretleri', 'ziyaret_bulgulari', 'ziyaret_dosyalari'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ekip_okur on public.%I for select to authenticated using (public.aktif_kullanici())', t);
    execute format('create policy ekip_ekler on public.%I for insert to authenticated with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_gunceller on public.%I for update to authenticated using (public.aktif_kullanici()) with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_siler on public.%I for delete to authenticated using (public.aktif_kullanici())', t);
  end loop;
end $$;

-- Dosya deposu (Supabase Storage): özel kova, yalnızca aktif ekip üyeleri.
-- Yerel test veritabanında storage şeması yoksa atlanır.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('saha', 'saha', false, 10485760)
    on conflict (id) do nothing;

    execute $p$create policy saha_okur on storage.objects for select to authenticated
      using (bucket_id = 'saha' and public.aktif_kullanici())$p$;
    execute $p$create policy saha_yukler on storage.objects for insert to authenticated
      with check (bucket_id = 'saha' and public.aktif_kullanici())$p$;
    execute $p$create policy saha_siler on storage.objects for delete to authenticated
      using (bucket_id = 'saha' and public.aktif_kullanici())$p$;
  end if;
end $$;
