-- =============================================
-- Permissões para o site (anon) ler produtos, imagens e categorias
-- Cole no SQL Editor do Supabase e execute
-- =============================================

-- Schema já deve estar acessível; garante uso para anon
GRANT USAGE ON SCHEMA favelastore TO anon, authenticated;

-- Leitura pública (catálogo) para anon
GRANT SELECT ON favelastore.products TO anon;
GRANT SELECT ON favelastore.categories TO anon;

-- product_images: se for tabela no schema favelastore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'favelastore' AND table_name = 'product_images'
  ) THEN
    EXECUTE 'GRANT SELECT ON favelastore.product_images TO anon';
  END IF;
END $$;

-- Garante colunas em products (se não existirem)
ALTER TABLE favelastore.products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE favelastore.products ADD COLUMN IF NOT EXISTS shopify_product_url text;

-- RLS em products: se RLS estiver ativo, anon precisa poder ler onde is_active = true
ALTER TABLE favelastore.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_anon_select_products" ON favelastore.products;
CREATE POLICY "fs_anon_select_products" ON favelastore.products
  FOR SELECT TO anon USING (is_active = true);

-- authenticated (admin) pode tudo em products
DROP POLICY IF EXISTS "fs_auth_all_products" ON favelastore.products;
CREATE POLICY "fs_auth_all_products" ON favelastore.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- service_role continua com acesso total (já costuma ter)
GRANT SELECT, INSERT, UPDATE, DELETE ON favelastore.products TO service_role;
GRANT SELECT ON favelastore.categories TO service_role;
GRANT SELECT ON favelastore.product_images TO service_role;

-- RLS em product_images e categories: anon precisa ler para o join da página de produto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'favelastore' AND table_name = 'product_images') THEN
    ALTER TABLE favelastore.product_images ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "fs_anon_select_product_images" ON favelastore.product_images;
    CREATE POLICY "fs_anon_select_product_images" ON favelastore.product_images FOR SELECT TO anon USING (true);
    DROP POLICY IF EXISTS "fs_auth_all_product_images" ON favelastore.product_images;
    CREATE POLICY "fs_auth_all_product_images" ON favelastore.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE favelastore.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fs_anon_select_categories" ON favelastore.categories;
CREATE POLICY "fs_anon_select_categories" ON favelastore.categories FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "fs_auth_all_categories" ON favelastore.categories;
CREATE POLICY "fs_auth_all_categories" ON favelastore.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
