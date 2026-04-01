# Resolver erro 500 / 25002 ao sincronizar com o eBay

Se você recebe **"Erro 500 do eBay (System error)"** ou **errorId 25002** ao publicar ofertas, siga este checklist na ordem. A maioria dos problemas vem de configuração incompleta no Seller Hub ou no sandbox.

---

## 1. Sandbox vs Produção (muito comum)

O **sandbox do eBay é instável**. Erros 500 e 25002 costumam sumir ao usar **produção**.

**O que fazer:**
1. No `.env.local`, mude para:
   ```env
   EBAY_ENV=production
   ```
2. No [eBay Developer Portal](https://developer.ebay.com), cadastre a **RuName de produção** (não a do sandbox).
3. Gere um **novo Refresh Token** em produção (Admin → Obter Refresh Token, usando a conta de vendedor real).
4. Atualize `EBAY_REFRESH_TOKEN` no `.env` com o token de produção.
5. Reinicie o servidor / faça novo deploy.

---

## 2. Política de envio (Fulfillment) – obrigatório

A política de envio **precisa ter ao menos um serviço de envio** configurado.

**O que fazer:**
1. Acesse o **Seller Hub** do eBay (sandbox: sandbox.ebay.com, produção: ebay.com).
2. Vá em **Configurações** → **Business policies** (ou **Políticas de vendedor**).
3. Abra a política de **Fulfillment / Shipping** cujo ID está em `EBAY_FULFILLMENT_POLICY_ID`.
4. Confira se há **ao menos um serviço de envio** (ex.: Flat rate, USPS, FedEx).
5. Se não houver, adicione um (ex.: "Flat rate domestic" com valor fixo).
6. Salve a política.

---

## 3. Política de devolução (Return)

A política de devolução precisa estar **configurada** (não pode estar vazia).

**O que fazer:**
1. No Seller Hub → **Business policies** → **Return policy**.
2. Abra a política em `EBAY_RETURN_POLICY_ID`.
3. Defina se aceita devoluções, prazo, etc.
4. Salve.

---

## 4. Local de estoque (Inventory location)

O local precisa ter **endereço completo**, incluindo **país**.

**O que fazer:**
1. Seller Hub → **Account** → **Inventory locations**.
2. Abra o local cuja chave está em `EBAY_MERCHANT_LOCATION_KEY` (ex.: `default`).
3. Preencha:
   - **Country**: United States (US) – ou o país onde você vende
   - **Address line 1**
   - **City**
   - **State/Province**
   - **Postal code**
4. Salve.

**Opcional no .env** (para criar/atualizar o local via API):
```env
EBAY_LOCATION_COUNTRY=US
EBAY_LOCATION_POSTAL_CODE=06606
EBAY_LOCATION_STATE=CT
EBAY_LOCATION_CITY=Bridgeport
EBAY_LOCATION_ADDRESS_LINE1=582 Gurdon St
```

---

## 5. Categoria (EBAY_CATEGORY_ID)

Use uma **categoria folha** válida para o marketplace.

**O que fazer:**
1. No eBay, crie um anúncio manual do mesmo tipo de produto.
2. Ao escolher a categoria, anote o **ID da categoria** (aparece na URL ou nas ferramentas do vendedor).
3. Exemplos para EBAY_US (roupas):
   - `11450` – Men's Clothing
   - `53159` – Men's Shirts
4. Coloque no `.env`:
   ```env
   EBAY_CATEGORY_ID=11450
   ```

---

## 6. Imagem do produto

O eBay exige **ao menos uma imagem** por oferta. Produtos sem imagem **não serão publicados**.

**O que fazer:**
1. No admin do site, confira se cada produto tem ao menos uma foto.
2. Produtos sem imagem serão ignorados na sincronização (com aviso).

---

## 7. Opt-in em Business Policies

Você precisa ter **opt-in** no programa de políticas de negócio.

**O que fazer:**
1. Seller Hub → **Business policies**.
2. Se aparecer opção para "Opt in" ou "Enroll", faça isso.
3. Depois crie/edite as políticas de pagamento, devolução e envio.

---

## 8. IDs das políticas corretos

Os IDs no `.env` devem ser os **IDs numéricos** das políticas, não os nomes.

**Onde achar:**
1. Seller Hub → Business policies.
2. Ao abrir cada política, o ID costuma aparecer na URL ou em "Policy ID".
3. Exemplo: `EBAY_FULFILLMENT_POLICY_ID=12345678901`

---

## 9. Marketplace e moeda

O código usa **USD** e **EBAY_US** por padrão. Se você vende em outro marketplace (ex.: Brasil), pode ser necessário ajustar.

**Verifique:**
- `EBAY_MARKETPLACE_ID` – ex.: EBAY_US, EBAY_BR
- As políticas devem ser do **mesmo marketplace**.

---

## Resumo rápido

| Item | Onde verificar |
|------|----------------|
| EBAY_ENV=production | .env – evita bugs do sandbox |
| Fulfillment com shipping | Seller Hub → Business policies → Fulfillment |
| Return policy configurada | Seller Hub → Business policies → Return |
| Local com endereço completo | Seller Hub → Inventory locations |
| Categoria folha válida | EBAY_CATEGORY_ID no .env |
| Produto com imagem | Admin do site |
| Opt-in em Business Policies | Seller Hub → Business policies |

---

## Teste rápido (30 segundos)

No Admin → **Sincronizar com eBay** → botão **Verificar configuração**.

Isso chama as APIs do eBay e checa:
- Inventory Location (se retornar vazio = erro comum)
- Política de envio existe e tem `shippingOptions`
- Token, políticas, marketplace ID

Se tudo estiver verde, a integração está pronta.

## Erro 500 no publish mesmo com "Configuração OK"

Se **Verificar configuração** passa mas a **Sincronizar** falha no publish com 500/25002:

1. **IDs das políticas são de produção?**  
   Os valores em `EBAY_PAYMENT_POLICY_ID`, `EBAY_RETURN_POLICY_ID` e `EBAY_FULFILLMENT_POLICY_ID` precisam ser os do **Seller Hub em produção** (ebay.com), não do sandbox.  
   → Acesse **ebay.com** (não sandbox.ebay.com) → Seller Hub → Business policies → anote os IDs de cada política e use no .env.

2. **Local "default" em produção tem endereço completo?**  
   → ebay.com → Seller Hub → Account → Inventory locations → abra **default** → preencha Country (US), Address, City, State, Postal code → Salve.

3. **Categoria**  
   `EBAY_CATEGORY_ID=11450` (Men's Clothing) é válida para EBAY_US. Se vender outro tipo de item, use uma categoria folha adequada.

4. **Tente de novo**  
   Erros 500 às vezes são temporários; espere alguns minutos e sincronize de novo (1 produto só).

## Ainda não funcionou?

1. **Espere alguns minutos** – erros 500 às vezes são temporários.
2. **Tente com 1 produto só** – escolha um produto com imagem e preço > US$ 0,99.
3. **Abra um caso no eBay Developer Support**: https://developer.ebay.com/support  
   Inclua: errorId 25002, mensagem completa, e que já seguiu este checklist.
