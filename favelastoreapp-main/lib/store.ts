/**
 * Slug da vitrine EliteKits no banco compartilhado (product_store_listings.store_slug).
 * Admin em /admin/elite-kits edita listagens com este slug.
 * No deploy deste site: NEXT_PUBLIC_STORE_SLUG=elite_kits
 */
export const STORE_SLUG_ELITE_KITS = "elite_kits";

/**
 * Quando definido (deploy da vitrine secundária), o catálogo público só mostra produtos
 * com listagem visible para este slug. Na loja principal: não defina ou deixe vazio.
 */
export function getPublicStoreSlug(): string | null {
  const s = process.env.NEXT_PUBLIC_STORE_SLUG?.trim();
  if (!s) return null;
  return s;
}

export function isSecondaryStorefront(): boolean {
  return getPublicStoreSlug() != null;
}
