import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getShopifyConfig,
  createShopifyProduct,
  updateShopifyProduct,
  buildShopifyProductUrl,
} from "@/lib/shopify/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function imageUrl(img: { url?: string | null; storage_path?: string }): string | null {
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path?.startsWith("http")) return img.storage_path;
  if (img.storage_path && SUPABASE_URL)
    return `${SUPABASE_URL}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

/**
 * POST /api/shopify-sync
 * Sincroniza produtos ativos do Supabase com a Shopify (cria novos, atualiza existentes)
 * e preenche shopify_product_id e shopify_product_url. Cliente clica "Comprar no Shopify" e vai para o checkout.
 * Requer .env: SHOPIFY_STORE (ex: favela-store), SHOPIFY_ACCESS_TOKEN (Admin API)
 */
export async function POST() {
  const config = getShopifyConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Shopify não configurado. Defina SHOPIFY_STORE (ex: favela-store) e SHOPIFY_ACCESS_TOKEN no .env.local.",
      },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { data: products } = await supabase
    .schema("favelastore")
    .from("products")
    .select(
      "id, name, description, price, stock, shopify_product_id, shopify_product_url, product_images(url, storage_path, sort_order)"
    )
    .eq("is_active", true);

  if (!products?.length) {
    return NextResponse.json({ synced: 0, created: 0, updated: 0, errors: [] });
  }

  let created = 0;
  let updated = 0;
  const errors: { productId: string; name: string; error: string }[] = [];

  for (const p of products as Array<{
    id: string;
    name: string | null;
    description: string | null;
    price: number | null;
    stock: number | null;
    shopify_product_id: string | null;
    shopify_product_url: string | null;
    product_images: { url?: string | null; storage_path?: string; sort_order?: number }[] | null;
  }>) {
    const imagesRaw = (p.product_images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const imageUrls = imagesRaw.map((img) => imageUrl(img)).filter((u): u is string => !!u);
    const title = (p.name || p.id).slice(0, 255);
    const bodyHtml = (p.description || p.name || "").slice(0, 5000);
    const price = (p.price != null ? Number(p.price).toFixed(2) : "0.00").slice(0, 20);
    const inventoryQuantity = p.stock != null ? Math.max(0, Number(p.stock)) : 1;

    if (p.shopify_product_id) {
      const result = await updateShopifyProduct(
        p.shopify_product_id,
        title,
        bodyHtml,
        price,
        inventoryQuantity,
        imageUrls
      );
      if (result.error) {
        errors.push({ productId: p.id, name: title, error: result.error });
      } else {
        updated++;
        const handle = result.handle;
        const url = handle ? buildShopifyProductUrl(handle) : p.shopify_product_url;
        if (url) {
          await supabase
            .schema("favelastore")
            .from("products")
            .update({ shopify_product_url: url })
            .eq("id", p.id);
        }
      }
    } else {
      const result = await createShopifyProduct(
        title,
        bodyHtml,
        price,
        inventoryQuantity,
        imageUrls
      );
      if (result.error) {
        errors.push({ productId: p.id, name: title, error: result.error });
      } else if (result.id && result.handle) {
        const url = buildShopifyProductUrl(result.handle);
        await supabase
          .schema("favelastore")
          .from("products")
          .update({
            shopify_product_id: String(result.id),
            shopify_product_url: url,
          })
          .eq("id", p.id);
        created++;
      }
    }
  }

  return NextResponse.json({
    synced: created + updated,
    created,
    updated,
    total: products.length,
    errors: errors.length ? errors : undefined,
  });
}
