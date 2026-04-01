-- Favela Store - Schema inicial
-- Catálogo de produtos com categorias e galeria de fotos

-- Habilitar extensões úteis
create extension if not exists "uuid-ossp";

-- =============================================
-- CATEGORIAS
-- =============================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_categories_slug on public.categories(slug);
create index idx_categories_active on public.categories(is_active) where is_active = true;

-- =============================================
-- PRODUTOS
-- =============================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  price decimal(10, 2), -- opcional, null = sob consulta
  sizes text[], -- ['P','M','G','GG'] para camisas, null para outros
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category_id, slug)
);

create index idx_products_category on public.products(category_id);
create index idx_products_slug on public.products(slug);
create index idx_products_active on public.products(is_active) where is_active = true;

-- =============================================
-- IMAGENS DOS PRODUTOS
-- =============================================
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_product_images_product on public.product_images(product_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

-- Público (anon): leitura apenas de itens ativos
create policy "anon_select_active_categories"
  on public.categories for select to anon
  using (is_active = true);

create policy "anon_select_active_products"
  on public.products for select to anon
  using (is_active = true);

create policy "anon_select_product_images"
  on public.product_images for select to anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_active = true
    )
  );

-- Admin (authenticated): acesso total
create policy "auth_all_categories"
  on public.categories for all to authenticated
  using (true) with check (true);

create policy "auth_all_products"
  on public.products for all to authenticated
  using (true) with check (true);

create policy "auth_all_product_images"
  on public.product_images for all to authenticated
  using (true) with check (true);

-- =============================================
-- TRIGGER updated_at
-- =============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at();

-- =============================================
-- SEED: categorias iniciais
-- =============================================
insert into public.categories (name, slug, sort_order) values
  ('Camisa', 'camisa', 1),
  ('Óculos', 'oculos', 2),
  ('Bermuda', 'bermuda', 3),
  ('Relógio', 'relogio', 4),
  ('Bandeira', 'bandeira', 5),
  ('Tênis', 'tenis', 6);
