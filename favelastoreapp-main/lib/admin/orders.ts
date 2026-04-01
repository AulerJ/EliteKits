"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export type AdminOrder = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  shipping_preference: string | null;
  product_ids: string[];
  raw_metadata: Record<string, unknown>;
  created_at: string | null;
  admin_viewed_at: string | null;
};

/** Contagem de pedidos que o admin ainda não marcou como vistos (para badge no menu). */
export async function getUnviewedOrdersCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .schema("favelastore")
    .from("orders")
    .select("raw_metadata")
    .limit(500);

  if (error) {
    console.error("[admin/orders] getUnviewedOrdersCount:", error);
    return 0;
  }

  const notViewed = (data ?? []).filter((row) => {
    const meta = (row.raw_metadata as Record<string, unknown>) ?? {};
    return !meta.admin_viewed_at;
  });
  return notViewed.length;
}

export async function getOrders(): Promise<AdminOrder[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .schema("favelastore")
    .from("orders")
    .select("id, stripe_session_id, customer_email, amount_total, currency, shipping_preference, product_ids, raw_metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin/orders] getOrders:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const meta = (row.raw_metadata as Record<string, unknown>) ?? {};
    return {
      id: row.id as string,
      stripe_session_id: (row.stripe_session_id as string) ?? null,
      customer_email: (row.customer_email as string) ?? null,
      amount_total: row.amount_total as number | null,
      currency: (row.currency as string) ?? null,
      shipping_preference: (row.shipping_preference as string) ?? null,
      product_ids: Array.isArray(row.product_ids) ? (row.product_ids as string[]) : [],
      raw_metadata: meta,
      created_at: (row.created_at as string) ?? null,
      admin_viewed_at: (meta.admin_viewed_at as string) ?? null,
    };
  });
}

export async function markOrderViewed(orderId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data: existing } = await supabase
    .schema("favelastore")
    .from("orders")
    .select("raw_metadata")
    .eq("id", orderId)
    .single();

  if (!existing?.raw_metadata || typeof existing.raw_metadata !== "object") {
    const { error } = await supabase
      .schema("favelastore")
      .from("orders")
      .update({ raw_metadata: { admin_viewed_at: new Date().toISOString() } })
      .eq("id", orderId);
    return !error;
  }

  const updated = {
    ...(existing.raw_metadata as Record<string, unknown>),
    admin_viewed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .schema("favelastore")
    .from("orders")
    .update({ raw_metadata: updated })
    .eq("id", orderId);

  return !error;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function productImageUrl(images: { url?: string | null; storage_path?: string }[] | null): string | null {
  const img = images?.[0];
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path) return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

export type ProductDetail = {
  id: string;
  name: string;
  size: string | null;
  imageUrl: string | null;
};

/** Retorna detalhes dos produtos (nome, tamanho, imagem) para exibir nas vendas. Inclui inativos. */
export async function getProductDetailsByIds(ids: string[]): Promise<Map<string, ProductDetail>> {
  const map = new Map<string, ProductDetail>();
  const supabase = createServiceRoleClient();
  if (!supabase || ids.length === 0) return map;

  const unique = [...new Set(ids)];
  const { data } = await supabase
    .schema("favelastore")
    .from("products")
    .select("id, name, size, product_images(url, storage_path)")
    .in("id", unique);

  for (const row of data ?? []) {
    const r = row as { id: string; name: string | null; size: string | null; product_images: { url?: string | null; storage_path?: string }[] | null };
    const images = r.product_images ?? null;
    map.set(r.id, {
      id: r.id,
      name: r.name?.trim() ?? "Produto",
      size: r.size?.trim() || null,
      imageUrl: productImageUrl(images),
    });
  }
  return map;
}

/** Retorna mapa id -> nome para produtos (inclui inativos). */
export async function getProductNamesByIds(ids: string[]): Promise<Map<string, string>> {
  const details = await getProductDetailsByIds(ids);
  const map = new Map<string, string>();
  for (const [id, d] of details) map.set(id, d.name);
  return map;
}
