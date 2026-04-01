-- Snapshot do checkout (cliente, itens com foto) para gravar em Vendas quando o pedido Shopify for pago
alter table favelastore.shopify_draft_order_products
  add column if not exists checkout_snapshot jsonb default '{}';

comment on column favelastore.shopify_draft_order_products.checkout_snapshot is 'Dados do carrinho no momento do checkout (para exibir em Admin Vendas após pagamento)';
