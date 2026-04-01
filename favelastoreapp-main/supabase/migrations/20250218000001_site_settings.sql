-- Tabela de configurações do site (ex: imagem da capa da home)
create schema if not exists favelastore;
create table if not exists favelastore.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
insert into favelastore.site_settings (key, value) values ('hero_image_url', '/logo.png'), ('hero_images', '[]')
on conflict (key) do nothing;
alter table favelastore.site_settings enable row level security;
drop policy if exists "fs_anon_select_site_settings" on favelastore.site_settings;
drop policy if exists "fs_auth_all_site_settings" on favelastore.site_settings;
create policy "fs_anon_select_site_settings" on favelastore.site_settings for select to anon using (true);
create policy "fs_auth_all_site_settings" on favelastore.site_settings for all to authenticated using (true) with check (true);
