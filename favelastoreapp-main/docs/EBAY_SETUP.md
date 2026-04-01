# Configurar eBay (conta developer já criada)

Você já tem a **conta eBay Developer**. Siga estes passos para ligar o site ao eBay e poder sincronizar produtos.

---

## Passo 1: App no Developer Portal

1. Acesse **[developer.ebay.com](https://developer.ebay.com)** e faça login.
2. Vá em **My Account** → **Application Keys** (ou **Applications**).
3. Crie um aplicativo (ou use um existente) e anote:
   - **App ID (Client ID)**
   - **Cert ID (Client Secret)**

---

## Passo 2: RuName (URL de redirecionamento)

**O que é:** RuName = “Redirect URL Name”. É a URL do *seu site* que o eBay usa para devolver o usuário depois que ele autoriza o app. Sem isso o eBay não gera o token.

**Onde criar:**

1. Acesse **[developer.ebay.com](https://developer.ebay.com)** e faça login.
2. Vá em **My Account** (ou **Account**) → **Application Keys**.
3. Na lista de aplicativos, ao lado do seu **App ID** (Client ID), clique em **User Tokens**.
4. Procure o texto **“Get a Token from eBay via Your Application”** (ou **“User Tokens | Notifications”**).
5. Se aparecer **“You have no Redirect URLs. Click here to add one”**, clique nesse link.  
   Se já existir RuName, use **“Add another Redirect URL”** ou **“Edit”** para adicionar uma nova.
6. Preencha o formulário:
   - **Display Title:** por exemplo: `Favela Store`
   - **Privacy Policy URL:** URL da sua política de privacidade (pode ser a página inicial do site, ex.: `https://seusite.com`)
   - **Auth Accepted URL:** **aqui você cola a URL do callback do seu site.**  
     Exemplo (troque pelo seu domínio):  
     `https://favelastoreapp-git-main-eduardo-curys-projects.vercel.app/admin/ebay-callback`  
     Essa URL tem que ser **HTTPS** e **exatamente igual** à que você vai colocar no `.env` como `EBAY_REDIRECT_URI`.
   - **Auth Declined URL:** pode ser a mesma que a Auth Accepted URL, ou a home do site.
7. Salve / **Continue to create RuName**.

Depois de salvar, o eBay mostra o **RuName** (um valor que eles geram). Para o nosso fluxo você **não precisa copiar esse valor**; o que importa é que a **Auth Accepted URL** seja exatamente a URL do seu site que recebe o callback (a mesma que você usa no passo 3 no `.env`).

---

## Passo 3: Variáveis de ambiente (credenciais)

No **.env.local** do projeto (e depois nas variáveis de ambiente da Vercel/hosting), adicione:

```env
# Obrigatório para gerar o token e sincronizar
EBAY_CLIENT_ID=seu_app_id_aqui
EBAY_CLIENT_SECRET=seu_cert_id_aqui
EBAY_REDIRECT_URI=https://seu-site.vercel.app/admin/ebay-callback
```

(O `EBAY_REDIRECT_URI` deve ser **exatamente** a mesma URL que você cadastrou como RuName no eBay.)

---

## Passo 4: Gerar o Refresh Token (User Token)

1. Faça login no **Admin** do seu site.
2. Vá em **Produtos** → **Sincronizar com eBay** (ou no menu **eBay** / **Configurar eBay**, se existir).
3. Na página de configuração do eBay:
   - Clique em **Abrir página de autorização do eBay**.
   - Você será levado ao eBay para fazer login e autorizar o app.
   - Depois de autorizar, o eBay redireciona de volta para o seu site em `/admin/ebay-callback?code=...`.
4. A página vai trocar esse `code` por um **Refresh Token** e mostrar na tela.
5. Copie o **Refresh Token** e adicione no `.env.local`:

```env
EBAY_REFRESH_TOKEN=o_token_que_apareceu_na_tela
```

6. Reinicie o servidor (ou faça novo deploy na Vercel com essa variável).

---

## Passo 5: Políticas de vendedor (obrigatório para publicar)

Para o eBay aceitar suas listagens, você precisa ter políticas de pagamento, devolução e envio na **conta de vendedor** (Seller Hub).

1. Acesse o **Seller Hub** do eBay (conta que vende).
2. Vá em **Configurações** (ou **Account**) → **Business policies** / **Políticas de vendedor**.
3. Crie ou use políticas existentes e anote os **IDs**:
   - **Payment policy** (pagamento)
   - **Return policy** (devolução)
   - **Fulfillment/Shipping policy** (envio)
4. No **Inventory** (estoque), veja o **Inventory location key** (geralmente `default`).

Adicione no `.env.local`:

```env
EBAY_PAYMENT_POLICY_ID=id_da_politica_pagamento
EBAY_RETURN_POLICY_ID=id_da_politica_devolucao
EBAY_FULFILLMENT_POLICY_ID=id_da_politica_envio
EBAY_MERCHANT_LOCATION_KEY=default
```

---

## Passo 6: Ambiente e marketplace

- **Sandbox (testes):** use `EBAY_ENV=sandbox` e faça o passo 4 no sandbox do eBay.
- **Produção (listagens reais):** use `EBAY_ENV=production`, cadastre a RuName de produção e gere o refresh token de novo na produção.

Opcional:

```env
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_CATEGORY_ID=11450
```

---

## Resumo do que você precisa

| Onde | O quê |
|------|--------|
| eBay Developer Portal | App ID, Cert ID, RuName (URL de callback) |
| .env.local | EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI |
| Admin do site | Gerar Refresh Token (botão "Abrir página de autorização") |
| .env.local | EBAY_REFRESH_TOKEN (copiado da tela) |
| Seller Hub | IDs das políticas (pagamento, devolução, envio) |
| .env.local | EBAY_PAYMENT_POLICY_ID, EBAY_RETURN_POLICY_ID, EBAY_FULFILLMENT_POLICY_ID |

Depois disso, em **Produtos** → **Sincronizar com eBay** você escolhe os produtos e clica em **Sincronizar** para enviar/atualizar as listagens no eBay.

Para mais detalhes da sincronização, veja [EBAY_SYNC.md](./EBAY_SYNC.md).
