import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicStoreSlug } from "@/lib/store";

/** Slug ativo no deploy atual (vitrine secundária), ou null = catálogo completo como loja principal. */
export function activeSecondaryStoreSlug(): string | null {
  return getPublicStoreSlug();
}

export type ListingPriceEntry = {
  /** null = usar products.price */
  priceOverride: number | null;
};

/**
 * Mapa product_id → preço da vitrine (override ou null para usar price do produto).
 * Só inclui produtos com visible = true para o slug.
 */
export async function fetchVisibleListingPriceMap(
  supabase: SupabaseClient,
  storeSlug: string
): Promise<Map<string, ListingPriceEntry>> {
  const map = new Map<string, ListingPriceEntry>();
  const { data, error } = await supabase
    .schema("favelastore")
    .from("product_store_listings")
    .select("product_id, price_override")
    .eq("store_slug", storeSlug)
    .eq("visible", true);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[store-listings] fetchVisibleListingPriceMap:", error.message);
    }
    return map;
  }
  for (const row of data ?? []) {
    const pid = row.product_id as string;
    const po = row.price_override;
    map.set(pid, {
      priceOverride: po != null && po !== "" ? Number(po) : null,
    });
  }
  return map;
}

export function applyListingPrice<T extends { id: string; price?: number | null }>(
  product: T,
  listingMap: Map<string, ListingPriceEntry>
): (T & { price: number | null }) | null {
  const entry = listingMap.get(product.id);
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
