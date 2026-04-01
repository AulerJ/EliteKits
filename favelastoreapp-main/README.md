# Favela Store - Catálogo de Produtos

App de catálogo para loja de camisas de time e acessórios. PWA instalável, mobile-first.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Supabase** (Auth, Postgres, Storage)
- **Tailwind CSS 4**
- **Vercel** (deploy)

## Estrutura do Projeto

```
favelastore/
├── app/                    # App Router (Next.js 16)
│   ├── (public)/           # Rotas públicas (catálogo)
│   ├── admin/              # Área admin (login, CRUD)
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── supabase/           # Cliente Supabase (browser, server, middleware)
│   └── types/              # Tipos TypeScript
├── supabase/
│   ├── migrations/         # Schema e seed
│   └── config.toml
└── public/
    ├── manifest.json       # PWA
    └── icon-192.png        # Ícones (criar)
```

## Schema Supabase

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `categories` | Categorias (Camisa, Óculos, Bermuda, Relógio, Bandeira, Tênis) |
| `products` | Produtos com nome, preço opcional, descrição, sizes (P,M,G,GG para camisas) |
| `product_images` | Múltiplas fotos por produto (armazenadas no Supabase Storage) |

### RLS

- **Público (anon)**: SELECT apenas em categorias e produtos ativos
- **Admin (authenticated)**: CRUD completo

### Storage

- Bucket `products`: imagens públicas, upload apenas por autenticados

## Setup

**Guia completo:** [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md)

### 1. Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Em **Settings > API**, copie `Project URL` e `anon public key`

### 2. Rodar migrations

```bash
# Instalar Supabase CLI (se não tiver)
npm i -g supabase

# Login e linkar projeto
supabase login
supabase link --project-ref SEU_PROJECT_REF

# Rodar migrations
supabase db push
```

Ou execute o SQL manualmente no **SQL Editor** do Dashboard:
- `supabase/migrations/20250218000000_initial_schema.sql`
- `supabase/migrations/20250218000001_storage_bucket.sql`

### 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999

# Cloudinary (storage de imagens - 25GB free)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

Para configurar o Cloudinary:
1. Crie conta grátis em [cloudinary.com](https://cloudinary.com)
2. No Dashboard > Settings > API Keys, copie Cloud name, API Key e API Secret
3. Adicione as 3 variáveis no `.env.local`

### 4. Bucket Storage (se a migration falhar)

No Supabase Dashboard > Storage:
1. **New bucket** > nome: `products`
2. Marque **Public bucket**
3. File size limit: 5 MB
4. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### 5. Logo da loja

Para usar sua própria logo: adicione `public/logo.png` (ou .svg) e, se usar outro nome, defina `NEXT_PUBLIC_LOGO_URL=/logo.png` no `.env.local`. O app usa `public/logo.svg` por padrão.

### 6. Ícones PWA

Crie ou gere ícones para:
- `public/icon-192.png` (192x192)
- `public/icon-512.png` (512x512)

Ou use um gerador como [realfavicongenerator.net](https://realfavicongenerator.net).

### 7. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Próximos passos (após estrutura)

- [ ] Tela pública de catálogo por categoria
- [ ] Galeria de fotos nos produtos
- [ ] Login admin (Supabase Auth)
- [ ] CRUD categorias e produtos no admin
- [ ] Upload de fotos
- [ ] Botão WhatsApp
- [ ] Deploy na Vercel
