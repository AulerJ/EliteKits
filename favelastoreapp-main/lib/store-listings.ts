import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicStoreSlug } from "@/lib/store";

/** Alinha IDs de produto (UUID) entre `products.id` e `product_store_listings.product_id`. */
export function normalizeListingProductId(id: string): string {
  return String(id).trim().toLowerCase();
}

/** Slug ativo no deploy atual (vitrine secundária), ou null = catálogo completo como loja principal. */
export function activeSecondaryStoreSlug(): string | null {
  return getPublicStoreSlug();
}

export type ListingPriceEntry = {
  /** null = usar products.price */
  priceOverride: number | null;
};

export type ListingFetchError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type ListingFetchResult = {
  map: Map<string, ListingPriceEntry>;
  error: ListingFetchError | null;
};

/**
 * Mapa product_id → preço da vitrine (override ou null para usar price do produto).
 * Só inclui produtos com visible = true para o slug.
 */
export async function fetchVisibleListingPriceMap(
  supabase: SupabaseClient,
  storeSlug: string
): Promise<ListingFetchResult> {
  const map = new Map<string, ListingPriceEntry>();
  const { data, error } = await supabase
    .schema("favelastore")
    .from("product_store_listings")
    .select("product_id, price_override")
    .eq("store_slug", storeSlug)
    .eq("visible", true);
  if (error) {
    const err: ListingFetchError = {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
    // eslint-disable-next-line no-console
    console.error("[store-listings] fetchVisibleListingPriceMap:", error.message, error);
    return { map, error: err };
  }
  for (const row of data ?? []) {
    const pid = normalizeListingProductId(row.product_id as string);
    const po = row.price_override;
    map.set(pid, {
      priceOverride: po != null && po !== "" ? Number(po) : null,
    });
  }
  return { map, error: null };
}

export function applyListingPrice<T extends { id: string; price?: number | null }>(
  product: T,
  listingMap: Map<string, ListingPriceEntry>
): (T & { price: number | null }) | null {
  const entry = listingMap.get(normalizeListingProductId(product.id));
  if (!entry) return null;
  const base = product.price ?? null;
  const price = entry.priceOverride != null ? entry.priceOverride : base;
  return { ...product, price };
}

export function filterAndApplyListingPrices<
  T extends { id: string; price?: number | null },
>(products: T[], listingMap: Map<string, ListingPriceEntry>): (T & { price: number | null })[] {
  const out: (T & { price: number | null })[] = [];
  for (const p of products) {
    const next = applyListingPrice(p, listingMap);
    if (next) out.push(next);
  }
  return out;
}

/** Para diagnóstico: checagem de vitrine com o mesmo critério do catálogo público. */
export function listingMapHas(
  listingMap: Map<string, ListingPriceEntry>,
  productId: string
): boolean {
  return listingMap.has(normalizeListingProductId(productId));
}

export function getListingPriceEntry(
  listingMap: Map<string, ListingPriceEntry>,
  productId: string
): ListingPriceEntry | undefined {
  return listingMap.get(normalizeListingProductId(productId));
}
