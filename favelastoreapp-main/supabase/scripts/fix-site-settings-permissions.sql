-- =============================================
-- Corrige "permission denied for table site_settings"
-- Cole no SQL Editor do Supabase e execute (Run).
-- Necessário para: service_role (chave no .env) e authenticated (admin logado).
-- =============================================

GRANT USAGE ON SCHEMA favelastore TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON favelastore.site_settings TO authenticated, service_role;
GRANT SELECT ON favelastore.site_settings TO anon;
