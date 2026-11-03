-- Madde listesindeki eksikler: imzalı nüsha takibi, iş kartları (kılavuz), müşteri görüşmeleri,
-- yetkili doğum günü, saha ziyaretinde tesis dosyası kontrolü.

-- Belgenin hazırlanması yetmez; imzalı hâlinin teslim alındığı da işlenir.
alter type public.olay_turu add value if not exists 'imzali_teslim';

-- İş kartları: her yükümlülük türü (ya da genel bir iş) için "ne yapılır, kimden ne istenir, nereye/hangi formatta, nelere dikkat".
-- Yeni personelin oryantasyon kılavuzu da bu kartlardan oluşur. Tüm ekip düzenleyebilir.
create table public.is_kartlari (
  id uuid primary key default gen_random_uuid(),
  tur_id uuid unique references public.yukumluluk_turleri (id) on delete cascade,  -- boşsa genel kart
  baslik text not null,
  yapilacaklar text,      -- her satır bir adım
  istenecekler text,      -- tesisten / kurumdan istenecek belge ve bilgiler, her satır bir madde
  nereye text,            -- başvuru yeri, uygulama (ÇBS, EÇBS…), format
  dikkat text,            -- sık yapılan hatalar, nüanslar
  sira int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Müşteriyle yapılan görüşmeler (telefon, e-posta, yüz yüze). Son temas tarihi bunlardan ve saha ziyaretlerinden çıkar.
create table public.tesis_gorusmeleri (
  id uuid primary key default gen_random_uuid(),
  tesis_id uuid not null references public.tesisler (id) on delete cascade,
  kisi_id uuid references public.kisiler (id) on delete set null,
  tarih date not null,
  kanal text not null default 'telefon' check (kanal in ('telefon', 'eposta', 'yuz_yuze', 'diger')),
  ozet text not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.tesis_gorusmeleri (tesis_id, tarih desc);

alter table public.kisiler add column dogum_gunu date;  -- yalnızca gün ve ay kullanılır

-- Ziyarette tesis dosyası kontrolü: { "<tesis_yukumluluk_id>": "tam" | "eksik" | "imzasiz" }
alter table public.saha_ziyaretleri add column dosya_kontrolu jsonb not null default '{}'::jsonb;

create trigger is_kartlari_zaman before update on public.is_kartlari
  for each row execute function public.zaman_damgasi();

do $$
declare t text;
begin
  foreach t in array array['is_kartlari', 'tesis_gorusmeleri'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ekip_okur on public.%I for select to authenticated using (public.aktif_kullanici())', t);
    execute format('create policy ekip_ekler on public.%I for insert to authenticated with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_gunceller on public.%I for update to authenticated using (public.aktif_kullanici()) with check (public.aktif_kullanici())', t);
    execute format('create policy ekip_siler on public.%I for delete to authenticated using (public.aktif_kullanici())', t);
  end loop;
end $$;

-- Danışmanın hazırlayıp tesise imzalattığı belgeler: imzalı nüsha teslim alınana kadar uyarı gösterilir.
update public.yukumluluk_turleri
  set parametreler = parametreler || '{"imzali_nusha": true}'::jsonb
  where kod in ('gfb_izin', 'eayp', 'kapasite');

-- Mevzuat değişikliğinde uyum için son tarih (müşteri bilgi notunda "uyum takvimi" olarak yer alır).
alter table public.mevzuat_degisiklikleri add column uyum_tarihi date;
