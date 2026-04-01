-- Rode no SQL Editor do Supabase para o webhook conseguir inserir em favelastore.orders
-- (service_role precisa de permissão no schema e na tabela)

GRANT USAGE ON SCHEMA favelastore TO service_role;
GRANT SELECT, INSERT, UPDATE ON favelastore.orders TO service_role;

-- Opcional: se o admin (authenticated) ler pedidos via API que usa anon/authenticated:
-- GRANT SELECT ON favelastore.orders TO authenticated;
