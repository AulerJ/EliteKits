import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ShopifyOrderPayload = {
  id?: number;
  draft_order_id?: number | null;
  email?: string | null;
  contact_email?: string | null;
  total_price?: string | null;
  currency?: string | null;
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    phone?: string | null;
  } | null;
};

type CheckoutSnapshot = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
  };
  shipping_preference?: "pickup" | "delivery";
  items?: {
    product_id: string;
    name: string | null;
    size: string | null;
    imageUrl: string | null;
    price: number | null;
    quantity: number;
  }[];
};

/**
 * POST /api/shopify/webhook
 * Order payment: desativa produtos no catálogo e grava pedido em Admin → Vendas.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const secret =
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
    process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (!secret || !hmacHeader) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 401 });
  }

  const expectedHmac = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    if (expectedHmac.length !== hmacHeader.length || !timingSafeEqual(Buffer.from(expectedHmac, "base64"), Buffer.from(hmacHeader, "base64"))) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody) as ShopifyOrderPayload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const draftOrderId = payload.draft_order_id != null ? String(payload.draft_order_id) : null;
  if (!draftOrderId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { data: row, error: fetchErr } = await supabase
    .schema("favelastore")
    .from("shopify_draft_order_products")
    .select("product_ids, checkout_snapshot")
    .eq("draft_order_id", draftOrderId)
    .single();

  const productIds = (row?.product_ids as string[] | undefined) ?? [];
  const snapshot = (row?.checkout_snapshot as CheckoutSnapshot | null) ?? null;

  if (!fetchErr && productIds.length > 0) {
    const { error: updateErr } = await supabase
      .schema("favelastore")
      .from("products")
      .update({ is_active: false })
      .in("id", productIds);

    if (updateErr) {
      console.error("[shopify/webhook] Erro ao desativar produtos:", updateErr);
      return NextResponse.json({ error: "Falha ao atualizar produtos." }, { status: 500 });
    }
  }

  const shopifyOrderId = payload.id;
  if (shopifyOrderId == null || fetchErr || !row) {
    return NextResponse.json({ received: true });
  }

  const stripeLikeId = `shopify:${shopifyOrderId}`;
  const { data: existing } = await supabase
    .schema("favelastore")
    .from("orders")
    .select("id")
    .eq("stripe_session_id", stripeLikeId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ received: true });
  }

  const totalStr = payload.total_price ?? "0";
  const amountTotal = Math.round(parseFloat(totalStr) * 100) || 0;
  const currency = (payload.currency ?? "usd").toLowerCase();
  const email =
    payload.email?.trim() ||
    payload.contact_email?.trim() ||
    snapshot?.customer?.email?.trim() ||
    null;

  const ship = payload.shipping_address;
  const snap = snapshot?.customer;
  const customerName =
    snap?.name?.trim() ||
    [ship?.first_name, ship?.last_name].filter(Boolean).join(" ").trim() ||
    email ||
    "Cliente";

  const customerPhone = snap?.phone?.trim() || ship?.phone?.trim() || "";
  const customerAddress =
    snap?.addressStreet || snap?.addressCity
      ? [snap.addressStreet, snap.addressCity, snap.addressState, snap.addressZip].filter(Boolean).join(", ")
      : [ship?.address1, ship?.city, ship?.province, ship?.zip].filter(Boolean).join(", ");

  const shippingPref = snapshot?.shipping_preference === "pickup" ? "pickup" : "delivery";

  const shopifyLineItems =
    snapshot?.items?.map((it) => ({
      product_id: it.product_id,
      name: it.name,
      size: it.size,
      image_url: it.imageUrl,
      quantity: it.quantity,
      price: it.price,
    })) ?? [];

  const rawMetadata: Record<string, unknown> = {
    source: "shopify",
    shopify_order_id: shopifyOrderId,
    draft_order_id: draftOrderId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    shopify_line_items: shopifyLineItems,
  };

  const { error: insertErr } = await supabase.schema("favelastore").from("orders").insert({
    stripe_session_id: stripeLikeId,
    customer_email: email,
    amount_total: amountTotal,
    currency,
    shipping_preference: shippingPref,
    product_ids: productIds.length ? productIds : [],
    raw_metadata: rawMetadata,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ received: true });
    }
    console.error("[shopify/webhook] Erro ao inserir pedido:", insertErr);
    return NextResponse.json({ error: "Falha ao gravar pedido." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
