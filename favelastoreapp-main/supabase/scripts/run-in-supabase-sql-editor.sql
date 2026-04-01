-- =============================================
-- COPIAR TUDO E COLAR NO SQL EDITOR DO SUPABASE
-- Executar de uma vez
-- =============================================

-- 1. Migration: parent_id e índice em categories
ALTER TABLE favelastore.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES favelastore.categories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fs_categories_parent ON favelastore.categories(parent_id);
ALTER TABLE favelastore.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
DROP INDEX IF EXISTS favelastore.idx_fs_categories_parent_slug;
CREATE UNIQUE INDEX idx_fs_categories_parent_slug ON favelastore.categories (coalesce(parent_id::text, 'root'), slug);

-- 2. Coluna image_url em categories (sem seed; categorias você cria no admin)
ALTER TABLE favelastore.categories ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Site settings
CREATE TABLE IF NOT EXISTS favelastore.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
INSERT INTO favelastore.site_settings (key, value) VALUES ('hero_image_url', 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=70')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE favelastore.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fs_anon_select_site_settings" ON favelastore.site_settings;
DROP POLICY IF EXISTS "fs_auth_all_site_settings" ON favelastore.site_settings;
CREATE POLICY "fs_anon_select_site_settings" ON favelastore.site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "fs_auth_all_site_settings" ON favelastore.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA favelastore TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON favelastore.site_settings TO authenticated;
GRANT SELECT ON favelastore.site_settings TO anon;

-- 4. Tabela de pedidos (webhook Stripe + admin Vendas)
CREATE TABLE IF NOT EXISTS favelastore.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  stripe_session_id text,
  customer_email text,
  amount_total bigint,
  currency text,
  shipping_preference text,
  product_ids text[] default '{}',
  raw_metadata jsonb default '{}'
);

CREATE INDEX IF NOT EXISTS idx_fs_orders_created_at ON favelastore.orders(created_at desc);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fs_orders_stripe_session ON favelastore.orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Permissões para o webhook (service_role) conseguir inserir pedidos
GRANT USAGE ON SCHEMA favelastore TO service_role;
GRANT SELECT, INSERT, UPDATE ON favelastore.orders TO service_role;
