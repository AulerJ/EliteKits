-- Quantidade disponível por produto: 1 = cliente compra só 1 unidade; > 1 = mostra seletor de quantidade
alter table favelastore.products add column if not exists stock int default 1;
