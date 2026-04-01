import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getTikTokShopConfig,
  createTikTokProduct,
  updateTikTokProduct,
  type TikTokProductPayload,
} from "@/lib/tiktok-shop/client";

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
 * POST /api/tiktok-sync
 * Sincroniza produtos ativos do Supabase com a TikTok Shop (cria novos, atualiza existentes).
 * Requer .env.local: TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET, TIKTOK_SHOP_ACCESS_TOKEN, TIKTOK_SHOP_REGION
 */
export async function POST() {
  const config = getTikTokShopConfig();
  if (!config) {
    return NextResponse.json(
      { error: "TikTok Shop não configurado. Defina TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET e TIKTOK_SHOP_ACCESS_TOKEN no .env.local." },
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
    .select("id, name, description, price, stock, tiktok_product_id, product_images(url, storage_path, sort_order)")
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
    tiktok_product_id: string | null;
    product_images: { url?: string | null; storage_path?: string; sort_order?: number }[] | null;
  }>) {
    const imagesRaw = (p.product_images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const imageUrls = imagesRaw.map((img) => imageUrl(img)).filter((u): u is string => !!u);
    const payload: TikTokProductPayload = {
      title: (p.name || p.id).slice(0, 255),
      description: (p.description || p.name || "").slice(0, 2000),
      price: {
        amount: (p.price != null ? Number(p.price).toFixed(2) : "0.00"),
        currency: "USD",
      },
      stock: p.stock != null ? Math.max(0, Number(p.stock)) : 1,
      images: imageUrls.length ? imageUrls.map((url) => ({ url })) : undefined,
      sku_id: p.id,
    };

    if (p.tiktok_product_id) {
      const result = await updateTikTokProduct(config, p.tiktok_product_id, payload);
      if (result.error) {
        errors.push({ productId: p.id, name: p.name || p.id, error: result.error });
      } else {
        updated++;
      }
    } else {
      const result = await createTikTokProduct(config, payload);
      if (result.error) {
        errors.push({ productId: p.id, name: p.name || p.id, error: result.error });
      } else if (result.productId) {
        await supabase
          .schema("favelastore")
          .from("products")
          .update({ tiktok_product_id: result.productId })
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
