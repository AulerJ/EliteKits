-- Guarda o ID do produto na TikTok Shop para atualizar em vez de criar duplicado
alter table favelastore.products add column if not exists tiktok_product_id text;
create index if not exists idx_fs_products_tiktok_product_id on favelastore.products(tiktok_product_id) where tiktok_product_id is not null;
