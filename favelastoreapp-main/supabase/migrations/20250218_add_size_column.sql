-- Adiciona coluna size para Camisa (S, M, L, XL, XXL, Feminina, Infantil)
-- Cada produto de camisa tem um tamanho específico

alter table favelastore.products add column if not exists size text;

create index if not exists idx_fs_products_size on favelastore.products(size) where size is not null;
