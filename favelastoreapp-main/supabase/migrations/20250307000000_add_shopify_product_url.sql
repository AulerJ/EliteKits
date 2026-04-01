-- Link para o produto na loja Shopify (checkout externo); ID para atualizar via API
alter table favelastore.products add column if not exists shopify_product_url text;
alter table favelastore.products add column if not exists shopify_product_id text;
