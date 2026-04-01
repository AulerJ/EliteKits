-- =============================================
-- Adiciona Feminina e Infantil em Camisas
-- Rode no SQL Editor do Supabase
-- =============================================

DO $$
DECLARE
  camisas_id uuid;
BEGIN
  SELECT id INTO camisas_id FROM favelastore.categories
  WHERE slug IN ('camisas', 'camisa') AND parent_id IS NULL LIMIT 1;

  IF camisas_id IS NOT NULL THEN
    BEGIN
      INSERT INTO favelastore.categories (parent_id, name, slug, sort_order, is_active)
      VALUES (camisas_id, 'Feminina', 'feminina', 8, true);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
      INSERT INTO favelastore.categories (parent_id, name, slug, sort_order, is_active)
      VALUES (camisas_id, 'Infantil', 'infantil', 9, true);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
END $$;
