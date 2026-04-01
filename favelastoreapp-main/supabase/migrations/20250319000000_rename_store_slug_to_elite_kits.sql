-- Renomeia listagens antigas de soccer_lover → elite_kits (vitrine EliteKits).
-- Seguro se não houver linhas: atualiza 0 rows.

update favelastore.product_store_listings
set store_slug = 'elite_kits'
where store_slug = 'soccer_lover';
