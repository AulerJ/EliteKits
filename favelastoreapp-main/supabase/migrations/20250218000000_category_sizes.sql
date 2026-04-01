-- Tabela de tamanhos por categoria (permite criar S, M, L para Camisa; 38, 40 para Bermuda; etc.)
create table if not exists favelastore.category_sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references favelastore.categories(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique(category_id, name)
);

create index if not exists idx_fs_category_sizes_category on favelastore.category_sizes(category_id);

alter table favelastore.category_sizes enable row level security;

drop policy if exists "fs_auth_all_category_sizes" on favelastore.category_sizes;
create policy "fs_auth_all_category_sizes" on favelastore.category_sizes
  for all to authenticated using (true) with check (true);

-- Seed: tamanhos para Camisa (se categoria existir)
insert into favelastore.category_sizes (category_id, name, sort_order)
select c.id, s.name, s.ord
from favelastore.categories c,
     (values 
       ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5), 
       ('Feminina', 6), ('Infantil', 7)
     ) as s(name, ord)
where c.slug = 'camisa'
on conflict (category_id, name) do nothing;
