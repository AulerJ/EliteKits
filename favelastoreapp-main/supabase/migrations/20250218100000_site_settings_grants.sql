-- Permissões para anon e authenticated acessarem site_settings
-- (RLS já controla quem vê/edita o quê)
grant usage on schema favelastore to anon, authenticated;
grant select, insert, update, delete on favelastore.site_settings to authenticated;
grant select on favelastore.site_settings to anon;
