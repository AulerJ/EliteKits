# TikTok Shop – Conectar sua loja ao TikTok (automático)

**No admin do site:** **TikTok Shop** (menu lateral) tem o passo a passo, link para conectar e botão para sincronizar. Use essa página como guia.

Você já criou a **TikTok Shop** (conta de vendedor) e a conta **TikTok for Developers**. Siga estes passos para ligar as duas e depois usar a sincronização automática do site.

---

## Parte 1: No TikTok for Developers (Partner Center)

1. **Entrar no Partner Center**
   - Acesse: **https://partner.tiktokshop.com** (ou o link da sua região, ex: US).
   - Faça login com a conta de desenvolvedor.

2. **Criar uma App**
   - Vá em **Console** → **App & Services** (ou **Develop your own app**).
   - Clique em **Create app** / **Create application**.
   - Preencha:
     - **App name**: ex. "Favela Store Sync"
     - **Service category**: algo como "Seller inhouse developer" ou "E-commerce"
     - **Market**: selecione o país da sua loja (ex. United States ou Brazil, conforme disponível).
   - Em **Callback URL** (Redirect URI) use uma URL que você controla. Para testes pode usar:
     - `https://seu-dominio.com/api/tiktok-auth/callback`
     - Ou, se o TikTok permitir, `http://localhost:3000/api/tiktok-auth/callback` só para desenvolvimento.
   - Salve / **Create**.

3. **Pegar as chaves**
   - Na página da app criada você verá:
     - **App Key** (às vezes chamado de App ID)
     - **App Secret**
   - Anote os dois em local seguro (você vai colocar no `.env.local`).

4. **Ativar as APIs de produto**
   - Na mesma app, abra **Manage API** / **API permissions**.
   - Ative permissões como:
     - **Product** (Create, Edit, Get product, etc.)
     - **Order** (opcional, se quiser sincronizar pedidos depois)
   - Salve.

5. **Publicar a app (se necessário)**
   - Em algumas regiões é preciso **Publish** a app para usar em produção. Siga o que aparecer no painel.

---

## Parte 2: Ligar a App à sua TikTok Shop (autorização do vendedor)

1. **No TikTok Seller Center (sua loja)**
   - Acesse o **Seller Center** do TikTok Shop (ex. **seller-us.tiktok.com** ou o da sua região).
   - Vá em **Settings** ou **App & Services** / **Authorized apps**.

2. **Autorizar sua app**
   - Procure opção tipo **Connect app** / **Authorize app** / **Develop your own app**.
   - Se pedir para ir ao Partner Center, use o link que você acessou na Parte 1.
   - Selecione a app que você criou (ex. "Favela Store Sync") e clique em **Authorize** / **Connect**.
   - Você será redirecionado para a **Callback URL** da app. Nessa etapa o TikTok pode mostrar um **Authorization code** na URL (ex. `?code=xxx`) ou pedir que você use a ferramenta “Generate test access token” no Partner Center.

3. **Obter o Access Token**
   - **Opção A – Token de teste (rápido para testar)**  
     No Partner Center → sua app → **API Testing Tool** ou **Generate test access token**.  
     Gere um token de teste e copie. Esse token costuma expirar em poucas horas.
   - **Opção B – Token “de produção” (recomendado)**  
     Implemente o fluxo OAuth no seu site (rota de callback em `/api/tiktok-auth/callback`).  
     Quando o vendedor autorizar, sua API troca o `code` por **access_token** e **refresh_token**.  
     Guarde o **access_token** (e o **refresh_token**) no `.env.local` ou em banco; o código deste projeto está preparado para usar variáveis de ambiente.

   Por enquanto você pode usar o **token de teste** para validar a sincronização. Depois podemos adicionar a rota de callback e refresh automático.

---

## Parte 3: Configurar o projeto (Favela Store)

1. **Variáveis de ambiente**
   - No projeto, abra ou crie o arquivo **`.env.local`** (na raiz).
   - Adicione (troque pelos valores reais da sua app e do token):

   ```env
   # TikTok Shop (obtidos no Partner Center e no passo de autorização)
   TIKTOK_SHOP_APP_KEY=seu_app_key
   TIKTOK_SHOP_APP_SECRET=seu_app_secret
   TIKTOK_SHOP_ACCESS_TOKEN=seu_access_token
   # Região da API: "us" ou "global" (conforme sua loja)
   TIKTOK_SHOP_REGION=global
   ```

   - Salve o arquivo. **Nunca** faça commit do `.env.local` (ele já deve estar no `.gitignore`).

2. **Rodar a migration do banco (uma vez)**
   - Para guardar o ID do produto na TikTok em cada produto do site, rode a migration:
     - Com Supabase local: `npx supabase db push` ou aplique o arquivo `supabase/migrations/20250306100000_add_tiktok_product_id.sql` no seu projeto.
     - No Supabase (dashboard): SQL Editor → cole o conteúdo dessa migration e execute.

3. **Sincronizar produtos**
   - Com o servidor rodando (`npm run dev`), você pode:
     - **Opção 1:** Chamar a API de sync a partir do admin (botão “Sincronizar com TikTok Shop”, se existir).
     - **Opção 2:** Enviar um POST manual para:  
       `http://localhost:3000/api/tiktok-sync`  
       (em produção use a URL do seu site).
   - A API lê os produtos ativos do seu site (Supabase), cria ou atualiza cada um na TikTok Shop e guarda o ID do TikTok no banco (`tiktok_product_id`).

---

## Resumo do fluxo

1. **TikTok for Developers** → Criar app → App Key + App Secret → Ativar APIs de produto.  
2. **TikTok Seller Center** → Autorizar essa app → Obter access token (teste ou OAuth).  
3. **Projeto** → Colocar App Key, App Secret, Access Token e região no `.env.local`; rodar a migration `tiktok_product_id`.  
4. **Uso** → Chamar `POST /api/tiktok-sync` (ou o botão no admin) para enviar/atualizar produtos automaticamente.

Se em algum passo aparecer um nome diferente (ex. “Seller Center” vs “Partner Center”), use o que estiver no menu da sua conta; a ordem lógica é a mesma: criar app → autorizar loja → pegar token → configurar env → sync.
