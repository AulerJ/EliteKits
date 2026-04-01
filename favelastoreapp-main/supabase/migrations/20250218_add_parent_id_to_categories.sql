-- =============================================
-- Categorias hierárquicas (pasta dentro de pasta, estilo Google Drive)
-- =============================================

-- Adicionar parent_id para suportar pastas dentro de pastas
alter table favelastore.categories add column if not exists parent_id uuid references favelastore.categories(id) on delete cascade;

create index if not exists idx_fs_categories_parent on favelastore.categories(parent_id);

-- Slug único por pai: (parent_id, slug) - permite "tamanho-p" em categorias diferentes
-- Remover unique(slug) antigo e criar novo
alter table favelastore.categories drop constraint if exists categories_slug_key;
alter table favelastore.categories drop constraint if exists categories_slug_unique;
create unique index if not exists idx_fs_categories_parent_slug 
  on favelastore.categories (coalesce(parent_id::text, ''), slug);
