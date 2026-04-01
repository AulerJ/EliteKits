-- Adiciona campo para foto personalizada da categoria (catálogo)
ALTER TABLE favelastore.categories ADD COLUMN IF NOT EXISTS image_url text;
