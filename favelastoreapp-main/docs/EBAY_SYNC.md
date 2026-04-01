# Sincronizar produtos com o eBay

Para manter o eBay atualizado junto com o site (enviar/atualizar listagens a partir dos produtos do Favela Store), siga estes passos.

## 1. Conta e app no eBay

1. Acesse [eBay Developers Program](https://developer.ebay.com/).
2. Crie uma conta de desenvolvedor e registre um **aplicativo**.
3. No app, anote:
   - **App ID** (Client ID)
   - **Cert ID** (Client Secret)
4. Gere um **Refresh Token** (User Token) para o vendedor:
   - Use o fluxo OAuth 2.0 do eBay (Authorization Code).
   - O refresh token permite que o site publique e atualize listagens em nome do vendedor.

## 2. Políticas de vendedor no eBay

No **Seller Hub** do eBay (conta de vendedor):

- Crie ou use uma **Política de pagamento** e anote o ID.
- Crie ou use uma **Política de devolução** e anote o ID.
- Crie ou use uma **Política de envio** e anote o ID.
- Configure um **Local de estoque** (inventory location) e anote a chave (ex.: `default`).

## 3. Variáveis de ambiente

No `.env.local` (nunca commite este arquivo), adicione:

```env
# eBay – sincronização de produtos
EBAY_CLIENT_ID=seu_app_id
EBAY_CLIENT_SECRET=seu_cert_id
EBAY_REFRESH_TOKEN=seu_refresh_token

# Opcional: use "production" quando for listar de verdade
EBAY_ENV=sandbox

# Marketplace (padrão: EBAY_US)
EBAY_MARKETPLACE_ID=EBAY_US

# Chave do local de estoque no eBay (ex.: default)
EBAY_MERCHANT_LOCATION_KEY=default

# Categoria eBay (ex.: 11450 = Roupas)
EBAY_CATEGORY_ID=11450

# IDs das políticas (obrigatório para publicar)
EBAY_PAYMENT_POLICY_ID=id_da_politica_pagamento
EBAY_RETURN_POLICY_ID=id_da_politica_devolucao
EBAY_FULFILLMENT_POLICY_ID=id_da_politica_envio
```

**Importante:** No Seller Hub, cada política deve estar completa:
- **Fulfillment (envio):** precisa ter ao menos um serviço de envio configurado (ex.: USPS, Flat rate).
- **Return (devolução):** precisa ter política de devolução definida.
- **Category:** use uma categoria folha válida. Ex.: 11450 (Men's Clothing). Para outros tipos de produto, crie um anúncio manual no eBay e veja o ID da categoria sugerida.

## 4. Como sincronizar

1. Faça login no **Admin** do site.
2. Vá em **Produtos**.
3. Clique em **Sincronizar com eBay**.

O sistema envia/atualiza no eBay todos os produtos ativos do site (título, descrição, preço, imagem). Cada produto é identificado pelo **ID** do site como SKU no eBay, então novas sincronizações atualizam preço e dados da oferta já existente.

## 6. Erro 500 / 25002 (System error)

Se ao **publicar** aparecer erro 500 ou 25002 com *"System error. Unable to process your request"*:

1. Veja o guia completo: **docs/EBAY_TROUBLESHOOTING.md** (ou Admin → Erro 500? Guia de troubleshooting).
2. As causas mais comuns: usar sandbox (mude para `EBAY_ENV=production`), política de envio sem serviço de envio, local sem endereço, categoria inválida.

## 7. Erro "No &lt;Item.Country&gt; exists" (25002)

Se ao **publicar** aparecer erro **25002** com a mensagem *"No &lt;Item.Country&gt; exists or &lt;Item.Country&gt; is specified as an empty"*:

1. **Local de estoque**  
   No **Seller Hub** do eBay (sandbox ou produção): **Account → Inventory locations** (ou equivalente). Abra o local cuja chave está em `EBAY_MERCHANT_LOCATION_KEY` e confira o **endereço**. O campo **Country** (país) deve estar preenchido (ex.: United States). Salve se tiver alterado.

2. **Política de envio (Fulfillment)**  
   Em **Business policies → Fulfillment**, abra a política cujo ID está em `EBAY_FULFILLMENT_POLICY_ID`. Verifique se há algum campo de origem/envio ou país e, se existir, preencha (ex.: US).

3. **Endereço da conta**  
   Em **Account → Addresses** (ou **Account settings**), confira se o endereço principal da conta tem **país** definido.

4. **Suporte eBay**  
   Se o erro continuar, abra um caso no [eBay Developer Support](https://developer.ebay.com/support) com o código **25002** e a mensagem completa. O suporte pode indicar exatamente de onde o eBay está lendo o Item.Country na sua conta (sandbox ou produção).

5. **Testar em produção**  
   No **sandbox**, o Item.Country às vezes continua falhando mesmo com local e endereço corretos (limitação conhecida). Se você tiver uma **conta de vendedor real** no eBay (produção), teste com `EBAY_ENV=production` no `.env` e o mesmo Refresh Token gerado para produção. Em produção o país do local costuma ser respeitado no publish.

## 8. Quando algo vende no eBay

Hoje a sincronização é **site → eBay**: o site envia ou atualiza listagens no eBay.  
Para que uma venda no eBay **atualize ou remova o produto do site** (estoque, inativo, etc.), seria necessário:

- Usar a API de **Orders** ou **Fulfillment** do eBay, e
- Um processo (cron ou webhook) que, ao detectar venda, atualize o Supabase (ex.: marcar produto como vendido ou reduzir estoque).

Isso pode ser implementado depois; por enquanto, você pode desativar o produto manualmente no admin após vender no eBay, ou futuramente integrar a API de pedidos.
