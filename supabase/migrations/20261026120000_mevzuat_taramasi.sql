-- Otomatik mevzuat taraması: zamanlanmış görev Resmî Gazete özetlerini tarar, bulduklarını "öneri" olarak yazar.
-- Ekip öneriyi onaylayınca (açık) ya da reddedince takipte görünür; görev açma her zaman insan onayıyla olur.

alter table public.mevzuat_degisiklikleri drop constraint mevzuat_degisiklikleri_durum_check;
alter table public.mevzuat_degisiklikleri
  add constraint mevzuat_degisiklikleri_durum_check check (durum in ('oneri', 'acik', 'kapali', 'reddedildi')),
  add column kaynak text not null default 'elle' check (kaynak in ('elle', 'excel', 'tarama')),
  add column kaynak_url text,
  add column tarama_notu text;  -- taramanın neden ilgili bulduğu

-- Aynı mevzuat ikinci kez önerilmesin (reddedilenler dahil)
create unique index mevzuat_degisiklikleri_tekil
  on public.mevzuat_degisiklikleri (lower(ad), coalesce(rg_metin, ''));

-- Entegrasyon anahtarları: yalnızca özeti (sha256) saklanır; anahtarın kendisi bir kez gösterilir.
create table public.entegrasyon_anahtarlari (
  id uuid primary key default gen_random_uuid(),
  amac text not null check (amac in ('mevzuat_tarama')),
  ozet text not null unique,
  aktif boolean not null default true,
  son_kullanim timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
alter table public.entegrasyon_anahtarlari enable row level security;
create policy yonetici_yonetir on public.entegrasyon_anahtarlari for all to authenticated
  using (public.yonetici_mi()) with check (public.yonetici_mi());

create or replace function public.tarama_anahtari_gecerli(p_anahtar text)
returns uuid
language sql security definer set search_path = public as $$
  update entegrasyon_anahtarlari set son_kullanim = now()
  where amac = 'mevzuat_tarama' and aktif and ozet = encode(sha256(convert_to(p_anahtar, 'UTF8')), 'hex')
  returning id
$$;
revoke all on function public.tarama_anahtari_gecerli(text) from public;

/** Taramanın ihtiyaç duyduğu bağlam: sektör grupları, kütüphane adları, son kayıtlar. */
create or replace function public.mevzuat_tarama_baglami(p_anahtar text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.tarama_anahtari_gecerli(p_anahtar) is null then
    return null;
  end if;
  return jsonb_build_object(
    'son_tarama', (select max(created_at) from mevzuat_degisiklikleri where kaynak = 'tarama'),
    'gruplar', (select coalesce(jsonb_agg(jsonb_build_object('kod', kod, 'ad', ad, 'tesisler', aciklama) order by length(kod), kod), '[]') from sektor_gruplari),
    'kutuphane', (select coalesce(jsonb_agg(ad order by ad), '[]') from mevzuat),
    'son_kayitlar', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', ad, 'rg', rg_metin, 'durum', durum)), '[]')
      from (select ad, rg_metin, durum from mevzuat_degisiklikleri order by tespit_tarihi desc, created_at desc limit 60) s
    )
  );
end $$;

/** Tarama bulgularını öneri olarak yazar; zaten kayıtlı olanları atlar. Eklenen sayısını döner (anahtar geçersizse null). */
create or replace function public.mevzuat_tarama_kaydet(p_anahtar text, p_kayitlar jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if public.tarama_anahtari_gecerli(p_anahtar) is null then
    return null;
  end if;
  if jsonb_typeof(p_kayitlar) <> 'array' or jsonb_array_length(p_kayitlar) > 50 then
    raise exception 'kayitlar en çok 50 öğelik dizi olmalı';
  end if;
  insert into mevzuat_degisiklikleri (tespit_tarihi, rg_metin, tur, ad, ozet, etkilenen_gruplar, etkilenen_tesisler, aksiyon,
                                      durum, kaynak, kaynak_url, tarama_notu)
  select current_date, left(x.rg_metin, 100), left(x.tur, 60), left(x.ad, 400), left(x.ozet, 2000), left(x.etkilenen_gruplar, 200),
         left(x.etkilenen_tesisler, 400), left(x.aksiyon, 500), 'oneri', 'tarama', left(x.kaynak_url, 500), left(x.tarama_notu, 1000)
  from jsonb_to_recordset(p_kayitlar) as x(rg_metin text, tur text, ad text, ozet text, etkilenen_gruplar text, etkilenen_tesisler text,
                                           aksiyon text, kaynak_url text, tarama_notu text)
  where coalesce(trim(x.ad), '') <> ''
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.mevzuat_tarama_baglami(text) from public;
revoke all on function public.mevzuat_tarama_kaydet(text, jsonb) from public;
grant execute on function public.mevzuat_tarama_baglami(text) to anon, authenticated;
grant execute on function public.mevzuat_tarama_kaydet(text, jsonb) to anon, authenticated;

-- Excel'den gelen kayıtlar
-- (aktarım betiği deterministik UUID v5 üretir; uygulamada eklenenler v4)
update public.mevzuat_degisiklikleri set kaynak = 'excel' where substr(id::text, 15, 1) = '5';
