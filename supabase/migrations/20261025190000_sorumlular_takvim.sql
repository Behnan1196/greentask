-- Sorumlu atama ve kişisel takvim aboneliği

-- Tesisin varsayılan sorumlu mühendisi. Yükümlülükte ayrıca sorumlu seçilmemişse bu kişi sorumludur.
alter table public.tesisler
  add column sorumlu_id uuid references public.profiller (id) on delete set null;
create index on public.tesisler (sorumlu_id);
create index on public.tesis_yukumlulukleri (sorumlu_id);

-- Takvim uygulamaları (Outlook, Google, iPhone) oturum açamaz; abonelik adresi kişiye özel gizli bir anahtar taşır.
-- Anahtarı yalnızca sahibi görür ve yenileyebilir.
create table public.takvim_anahtarlari (
  kullanici_id uuid primary key references public.profiller (id) on delete cascade,
  anahtar uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.takvim_anahtarlari enable row level security;
create policy kendi_anahtari on public.takvim_anahtarlari
  for all to authenticated
  using (kullanici_id = auth.uid() and public.aktif_kullanici())
  with check (kullanici_id = auth.uid() and public.aktif_kullanici());

-- Anahtarla çağrılır (oturumsuz). Kişinin sorumlu olduğu yükümlülükleri ve açık görevlerini döner;
-- termin hesabı uygulamadaki kural motorunda yapılır.
create or replace function public.takvim_verisi(p_anahtar uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  kid uuid;
begin
  select a.kullanici_id into kid
  from takvim_anahtarlari a join profiller p on p.id = a.kullanici_id
  where a.anahtar = p_anahtar and p.aktif;
  if kid is null then
    return null;
  end if;

  return jsonb_build_object(
    'kullanici', (select jsonb_build_object('id', id, 'ad_soyad', ad_soyad) from profiller where id = kid),
    'tesisler', (select coalesce(jsonb_agg(t), '[]'::jsonb) from tesisler t where t.aktif),
    'turler', (select coalesce(jsonb_agg(y), '[]'::jsonb) from yukumluluk_turleri y where y.aktif),
    'kayitlar', (
      select coalesce(jsonb_agg(k), '[]'::jsonb)
      from tesis_yukumlulukleri k left join tesisler t on t.id = k.tesis_id
      where coalesce(k.sorumlu_id, t.sorumlu_id) = kid
    ),
    'olaylar', (
      select coalesce(jsonb_agg(o), '[]'::jsonb)
      from yukumluluk_olaylari o
      join tesis_yukumlulukleri k on k.id = o.tesis_yukumluluk_id
      left join tesisler t on t.id = k.tesis_id
      where coalesce(k.sorumlu_id, t.sorumlu_id) = kid
    ),
    'gorevler', (
      select coalesce(jsonb_agg(g), '[]'::jsonb)
      from gorevler g
      where g.sorumlu_id = kid and g.durum in ('acik', 'devam') and g.son_tarih is not null
    )
  );
end $$;

revoke all on function public.takvim_verisi(uuid) from public;
grant execute on function public.takvim_verisi(uuid) to anon, authenticated;
