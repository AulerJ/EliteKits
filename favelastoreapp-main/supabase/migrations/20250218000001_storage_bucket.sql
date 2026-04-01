-- Políticas Storage para imagens de produtos
-- CRIAR BUCKET MANUALMENTE: Dashboard > Storage > New bucket
-- Nome: products | Public: sim | Limit: 5MB | MIME: image/jpeg, image/png, image/webp

-- Política: qualquer um pode ver imagens (bucket público)
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'products');

-- Apenas autenticados podem fazer upload
create policy "Authenticated can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products');

-- Autenticados podem atualizar/deletar
create policy "Authenticated can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products');

create policy "Authenticated can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products');
