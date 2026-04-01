# Setup Supabase - Favela Store

**Use o mesmo projeto do Amazon Review** – tudo do Favela Store fica isolado no schema `favelastore` e no bucket `favelastore_products`. Nada se mistura.

## 1. Abrir o projeto existente (amazon_review)

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Abra o projeto **amazon_review** (ou o que você usa)

## 2. Rodar o SQL (Migration)

1. No Dashboard, vá em **SQL Editor**
2. Clique em **New query**
3. Copie TODO o conteúdo do arquivo `supabase/schema-completo.sql`
4. Cole no editor e clique em **Run**

Isso cria:
- Schema `favelastore` (isolado do `public` usado pelo Amazon Review)
- Tabelas: `favelastore.categories`, `favelastore.products`, `favelastore.product_images`, `favelastore.category_sizes`
- Tabela `category_sizes`: tamanhos por categoria (S, M, L para Camisa; 38, 40 para Bermuda; etc.) – você gerencia em Admin > Tamanhos
- Políticas RLS e Storage para o bucket `favelastore_products`

**Nota:** Se der erro no `ALTER ROLE authenticator`, vá em **Settings** > **API** > **Exposed schemas** e adicione `favelastore` ao lado de `public`.

## 3. Criar bucket de Storage

1. Vá em **Storage** no menu lateral
2. Clique em **New bucket**
3. Nome: **`favelastore_products`** (não use `products` para evitar conflito)
4. Marque **Public bucket**
5. (Opcional) File size limit: 5 MB
6. (Opcional) Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
7. Clique em **Create bucket**

As políticas do Storage já foram criadas no passo 2.

## 4. Pegar credenciais

1. Vá em **Settings** (ícone engrenagem) > **API**
2. Copie:
   - **Project URL**
   - **anon public** (chave pública)

São as mesmas credenciais do Amazon Review.

## 5. Configurar .env.local no Favela Store

Na raiz do projeto `favelastoreapp`, crie ou edite `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-amazon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
```

Use a mesma URL e anon key do projeto amazon_review.

## 6. Configurar Auth (Redirect URLs)

Se ainda não tiver:

1. Vá em **Authentication** > **URL Configuration**
2. Em **Redirect URLs**, adicione:
   - `http://localhost:3000/auth/callback`
   - `https://seu-dominio-favelastore.vercel.app/auth/callback` (após deploy)

(O Amazon Review pode usar outro domínio – cada app pode ter sua própria URL.)

## 7. Usuário admin

Você pode usar o mesmo usuário do Amazon Review ou criar um novo:

1. **Authentication** > **Users** > **Add user**
2. Email e senha (ou Magic Link)

Qualquer usuário autenticado no projeto pode acessar o admin do Favela Store.

Pronto! Rode `npm run dev` e acesse `/admin/login`.

---

### Resumo: O que fica isolado

| Favela Store        | Amazon Review (não afetado) |
|---------------------|-----------------------------|
| Schema `favelastore` | Schema `public`             |
| Bucket `favelastore_products` | Buckets do Amazon       |
| Tabelas: categories, products, product_images | Suas tabelas em `public` |
