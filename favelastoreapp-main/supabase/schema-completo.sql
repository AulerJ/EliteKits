-- =============================================
-- FAVELA STORE - SCHEMA ISOLADO (schema favelastore)
-- Use no mesmo projeto Supabase do Amazon Review
-- Copie e rode no SQL Editor do Supabase
-- =============================================

-- Criar schema
create schema if not exists favelastore;

-- Expor schema para a API (necessário para o cliente acessar)
alter role authenticator set pgrst.db_schemas = 'public, favelastore';

-- Permissões
grant usage on schema favelastore to anon, authenticated, service_role;
grant all on all tables in schema favelastore to anon, authenticated, service_role;

-- CATEGORIAS (hierárquicas: pasta dentro de pasta, estilo Google Drive)
create table if not exists favelastore.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references favelastore.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_fs_categories_slug on favelastore.categories(slug);
create index if not exists idx_fs_categories_parent on favelastore.categories(parent_id);
create unique index if not exists idx_fs_categories_parent_slug on favelastore.categories (coalesce(parent_id::text, 'root'), slug);
create index if not exists idx_fs_categories_active on favelastore.categories(is_active) where is_active = true;

-- PRODUTOS
create table if not exists favelastore.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references favelastore.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  price decimal(10, 2),
  size text, -- Camisa: S, M, L, XL, XXL, Feminina, Infantil
  sizes text[], -- legado, pode manter vazio
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category_id, slug)
);

create index if not exists idx_fs_products_category on favelastore.products(category_id);
create index if not exists idx_fs_products_slug on favelastore.products(slug);
create index if not exists idx_fs_products_active on favelastore.products(is_active) where is_active = true;
-- Adicionar coluna size se tabela já existir (para projetos existentes)
alter table favelastore.products add column if not exists size text;
alter table favelastore.products add column if not exists stock int default 1;
create index if not exists idx_fs_products_size on favelastore.products(size) where size is not null;

-- IMAGENS
create table if not exists favelastore.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references favelastore.products(id) on delete cascade,
  storage_path text not null,
  url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_fs_product_images_product on favelastore.product_images(product_id);

-- TAMANHOS POR CATEGORIA (S, M, L para Camisa; 38, 40 para Bermuda; etc.)
create table if not exists favelastore.category_sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references favelastore.categories(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique(category_id, name)
);

create index if not exists idx_fs_category_sizes_category on favelastore.category_sizes(category_id);

-- PEDIDOS (webhook Stripe + admin Vendas)
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

-- CONFIGURAÇÕES DO SITE (ex: imagem da capa)
create table if not exists favelastore.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
-- Valor padrão da capa (pode ser alterado no admin)
insert into favelastore.site_settings (key, value) values ('hero_image_url', '/logo.png')
on conflict (key) do nothing;
alter table favelastore.site_settings enable row level security;
create policy "fs_anon_select_site_settings" on favelastore.site_settings for select to anon using (true);
create policy "fs_auth_all_site_settings" on favelastore.site_settings for all to authenticated using (true) with check (true);

-- RLS
alter table favelastore.categories enable row level security;
alter table favelastore.products enable row level security;
alter table favelastore.product_images enable row level security;

-- Remover políticas antigas se existirem
drop policy if exists "fs_anon_select_active_categories" on favelastore.categories;
drop policy if exists "fs_anon_select_active_products" on favelastore.products;
drop policy if exists "fs_anon_select_product_images" on favelastore.product_images;
drop policy if exists "fs_auth_all_categories" on favelastore.categories;
drop policy if exists "fs_auth_all_products" on favelastore.products;
drop policy if exists "fs_auth_all_product_images" on favelastore.product_images;

-- Público: só ativos
create policy "fs_anon_select_active_categories" on favelastore.categories for select to anon using (is_active = true);
create policy "fs_anon_select_active_products" on favelastore.products for select to anon using (is_active = true);
create policy "fs_anon_select_product_images" on favelastore.product_images for select to anon
  using (exists (select 1 from favelastore.products p where p.id = product_images.product_id and p.is_active = true));

-- Admin: tudo
create policy "fs_auth_all_categories" on favelastore.categories for all to authenticated using (true) with check (true);
create policy "fs_auth_all_products" on favelastore.products for all to authenticated using (true) with check (true);
create policy "fs_auth_all_product_images" on favelastore.product_images for all to authenticated using (true) with check (true);

alter table favelastore.category_sizes enable row level security;
create policy "fs_auth_all_category_sizes" on favelastore.category_sizes for all to authenticated using (true) with check (true);

-- Trigger updated_at
create or replace function favelastore.update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists categories_updated_at on favelastore.categories;
create trigger categories_updated_at before update on favelastore.categories for each row execute function favelastore.update_updated_at();

drop trigger if exists products_updated_at on favelastore.products;
create trigger products_updated_at before update on favelastore.products for each row execute function favelastore.update_updated_at();

-- Seed categorias: rode migrations/20250218_seed_categorias_favelastore.sql no SQL Editor

-- =============================================
-- STORAGE - Bucket favelastore_products
-- Criar bucket manualmente: Storage > New bucket > "favelastore_products" (Public)
-- =============================================
drop policy if exists "fs_public_view" on storage.objects;
drop policy if exists "fs_auth_upload" on storage.objects;
drop policy if exists "fs_auth_update" on storage.objects;
drop policy if exists "fs_auth_delete" on storage.objects;

create policy "fs_public_view" on storage.objects for select using (bucket_id = 'favelastore_products');
create policy "fs_auth_upload" on storage.objects for insert to authenticated with check (bucket_id = 'favelastore_products');
create policy "fs_auth_update" on storage.objects for update to authenticated using (bucket_id = 'favelastore_products');
create policy "fs_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'favelastore_products');
