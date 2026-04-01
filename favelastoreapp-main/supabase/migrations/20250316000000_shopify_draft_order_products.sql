-- Mapeamento draft_order_id (Shopify) -> product_ids para desativar produtos quando o pedido for pago
create table if not exists favelastore.shopify_draft_order_products (
  draft_order_id text primary key,
  product_ids text[] not null default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_fs_shopify_draft_created on favelastore.shopify_draft_order_products(created_at desc);

comment on table favelastore.shopify_draft_order_products is 'Draft orders da Shopify: ao receber webhook order/paid, desativamos estes produtos no catálogo';
