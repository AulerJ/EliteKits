-- =============================================
-- SEED: Categorias e subcategorias Favela Store
-- Rode no SQL Editor do Supabase
-- =============================================

-- Garante que parent_id existe (migration anterior)
alter table favelastore.categories add column if not exists parent_id uuid references favelastore.categories(id) on delete cascade;

-- Insere categorias raiz e subcategorias de camisas
DO $$
DECLARE
  cat RECORD;
  camisas_id uuid;
  subcats text[] := array['S','M','L','XL','XXL','XXXL','XXXXL','Feminina','Infantil'];
  sub_slugs text[] := array['s','m','l','xl','xxl','xxxl','xxxxl','feminina','infantil'];
  i int;
BEGIN
  -- Lista de categorias raiz (nome, slug, ordem)
  FOR cat IN 
    SELECT * FROM (VALUES 
      ('Bandeira', 'bandeira', 1),
      ('Bermuda', 'bermuda', 2),
      ('Bikini', 'bikini', 3),
      ('Boné', 'bone', 4),
      ('Camisas', 'camisas', 5),
      ('Canga', 'canga', 6),
      ('Chaveiro', 'chaveiro', 7),
      ('Cinto', 'cinto', 8),
      ('Correntes', 'correntes', 9),
      ('Juliet', 'juliet', 10),
      ('Kenner', 'kenner', 11),
      ('Tênis', 'tenis', 12),
      ('Relógio', 'relogio', 13),
      ('Pochete', 'pochete', 14),
      ('Pulseira de Pano', 'pulseira-de-pano', 15)
    ) AS t(name, slug, ord)
  LOOP
    BEGIN
      INSERT INTO favelastore.categories (parent_id, name, slug, sort_order, is_active)
      VALUES (NULL, cat.name, cat.slug, cat.ord, true);
    EXCEPTION WHEN unique_violation THEN
      NULL; -- já existe
    END;
  END LOOP;

  -- Pega id de Camisas
  SELECT id INTO camisas_id FROM favelastore.categories 
  WHERE slug = 'camisas' AND parent_id IS NULL LIMIT 1;

  -- Subcategorias de Camisas: S, M, L, XL, XXL, XXXL, XXXXL
  IF camisas_id IS NOT NULL THEN
    FOR i IN 1..array_length(subcats, 1) LOOP
      BEGIN
        INSERT INTO favelastore.categories (parent_id, name, slug, sort_order, is_active)
        VALUES (camisas_id, subcats[i], sub_slugs[i], i, true);
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;
