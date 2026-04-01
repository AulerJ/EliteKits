-- Tabela de pedidos (webhook Stripe + admin Vendas)
-- Rode no SQL Editor do Supabase se a tabela ainda não existir

create table if not exists favelastore.orders (
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

create index if not exists idx_fs_orders_created_at on favelastore.orders(created_at desc);
create unique index if not exists idx_fs_orders_stripe_session on favelastore.orders(stripe_session_id) where stripe_session_id is not null;

comment on table favelastore.orders is 'Pedidos do Stripe Checkout (webhook checkout.session.completed)';
