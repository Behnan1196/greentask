-- Mevzuat takibi: değişiklikten açılan görevler değişikliğe bağlanır (hangi tesise açıldı, kaçı bitti).
alter table public.gorevler
  add column mevzuat_degisikligi_id uuid references public.mevzuat_degisiklikleri (id) on delete set null;
create index on public.gorevler (mevzuat_degisikligi_id);
