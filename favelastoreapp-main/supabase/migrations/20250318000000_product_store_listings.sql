-- Vitrines secundárias: mesmos produtos do Supabase compartilhado, visibilidade e preço por loja.
-- Ex.: store_slug = elite_kits (EliteKits) — só aparece no site com NEXT_PUBLIC_STORE_SLUG=elite_kits quando visible = true.

create table if not exists favelastore.product_store_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references favelastore.products(id) on delete cascade,
  store_slug text not null,
  visible boolean not null default false,
  price_override numeric(10, 2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, store_slug)
);

create index if not exists idx_fs_product_store_listings_slug_visible
  on favelastore.product_store_listings (store_slug)
  where visible = true;

create index if not exists idx_fs_product_store_listings_product
  on favelastore.product_store_listings (product_id);

comment on table favelastore.product_store_listings is
  'Listagem por vitrine (ex. elite_kits): visible + price_override opcional; catálogo público filtra por aqui.';

-- RLS: leitura pública só de linhas visíveis (para anon sem service role em algumas rotas)
alter table favelastore.product_store_listings enable row level security;

drop policy if exists "fs_anon_select_visible_product_store_listings" on favelastore.product_store_listings;
create policy "fs_anon_select_visible_product_store_listings"
  on favelastore.product_store_listings
  for select
  to anon
  using (visible = true);

drop policy if exists "fs_auth_all_product_store_listings" on favelastore.product_store_listings;
create policy "fs_auth_all_product_store_listings"
  on favelastore.product_store_listings
  for all
  to authenticated
  using (true)
  with check (true);

grant select on favelastore.product_store_listings to anon;
grant select, insert, update, delete on favelastore.product_store_listings to authenticated;

create or replace function favelastore.update_product_store_listings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_product_store_listings_updated_at on favelastore.product_store_listings;
create trigger trg_product_store_listings_updated_at
  before update on favelastore.product_store_listings
  for each row execute function favelastore.update_product_store_listings_updated_at();
