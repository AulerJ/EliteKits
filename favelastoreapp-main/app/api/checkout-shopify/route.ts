import { NextRequest, NextResponse } from "next/server";
import { createDraftOrder } from "@/lib/shopify/client";
import { getShopifyConfig } from "@/lib/shopify/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

const DELIVERY_FEE = 9;

type CheckoutItem = {
  id: string;
  name: string | null;
  price: number | null;
  quantity: number;
  size?: string | null;
  imageUrl?: string | null;
};

/**
 * POST /api/checkout-shopify
 * Cria um Draft Order na Shopify com os itens do carrinho e redireciona o cliente para pagar lá.
 * Não precisa ter produtos na loja Shopify — só o pagamento.
 */
export async function POST(req: NextRequest) {
  if (!getShopifyConfig()) {
    return NextResponse.json(
      {
        error:
          "Shopify não configurado. Defina SHOPIFY_STORE e SHOPIFY_ACCESS_TOKEN no .env.local (Admin API com permissão draft_orders).",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      items: CheckoutItem[];
      customer?: {
        name?: string;
        email?: string;
        phone?: string;
        addressStreet?: string;
        addressCity?: string;
        addressState?: string;
        addressZip?: string;
      };
      shippingMethod?: "pickup" | "delivery";
    };

    const validItems = (body.items || []).filter(
      (i) => i && typeof i.id === "string" && i.quantity > 0
    );
    if (!validItems.length) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    }

    const lineItems = validItems.map((item) => {
      const name =
        item.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(item.name)
          ? item.name.trim()
          : "Produto";
      const title =
        item.size?.trim()
          ? `${name} – Tamanho: ${item.size.trim()}`
          : name;
      const price =
        typeof item.price === "number" && item.price >= 0
          ? item.price.toFixed(2)
          : "0.00";
      const properties =
        item.size?.trim()
          ? [{ name: "Tamanho", value: item.size.trim() }]
          : undefined;
      return {
        title,
        price,
        quantity: item.quantity,
        properties,
        imageUrl: item.imageUrl?.trim() || null,
      };
    });

    if (body.shippingMethod === "delivery") {
      lineItems.push({
        title: "Frete - Entrega (EUA)",
        price: DELIVERY_FEE.toFixed(2),
        quantity: 1,
        properties: undefined,
        imageUrl: null,
      });
    }

    /** IDs base dos produtos (sem sufixo __Tamanho) para desativar quando o pedido for pago */
    const productIdsForDeactivate = [
      ...new Set(
        validItems.map((i) => (i.id.includes("__") ? i.id.replace(/__.*$/, "") : i.id))
      ),
    ];

    const customer = body.customer;
    const shippingAddress =
      body.shippingMethod === "delivery" && customer?.addressStreet
        ? {
            first_name: customer.name?.split(/\s+/)[0] || "",
            last_name: customer.name?.split(/\s+/).slice(1).join(" ") || "",
            address1: customer.addressStreet || "",
            city: customer.addressCity || "",
            province: customer.addressState || "",
            country: "United States",
            zip: customer.addressZip || "",
            phone: customer.phone || "",
          }
        : undefined;

    const itemsNote = validItems
      .map((i) => {
        const name = i.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(i.name ?? "") ? i.name.trim() : "Produto";
        const size = i.size?.trim() ? ` Tamanho ${i.size.trim()}` : "";
        return `${name}${size} × ${i.quantity}`;
      })
      .join("; ");
    const brand = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "EliteKits";
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
    const result = await createDraftOrder({
      lineItems,
      email: customer?.email?.trim() || undefined,
      note: `Pedido ${brand}${siteBase ? ` - ${siteBase}` : ""}. Itens: ${itemsNote}`,
      shippingAddress,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!result.invoiceUrl) {
      return NextResponse.json(
        { error: "Shopify não retornou o link de pagamento." },
        { status: 500 }
      );
    }

    const checkoutSnapshot = {
      customer: {
        name: customer?.name?.trim() || "",
        email: customer?.email?.trim() || "",
        phone: customer?.phone?.trim() || "",
        addressStreet: customer?.addressStreet?.trim() || "",
        addressCity: customer?.addressCity?.trim() || "",
        addressState: customer?.addressState?.trim() || "",
        addressZip: customer?.addressZip?.trim() || "",
      },
      shipping_preference: body.shippingMethod === "pickup" ? "pickup" : "delivery",
      items: validItems.map((i) => ({
        product_id: i.id.includes("__") ? i.id.replace(/__.*$/, "") : i.id,
        name: i.name,
        size: i.size ?? null,
        imageUrl: i.imageUrl?.trim() || null,
        price: i.price,
        quantity: i.quantity,
      })),
    };

    if (result.draftOrderId && productIdsForDeactivate.length > 0) {
      const supabase = createServiceRoleClient();
      if (supabase) {
        await supabase
          .schema("favelastore")
          .from("shopify_draft_order_products")
          .upsert(
            {
              draft_order_id: result.draftOrderId,
              product_ids: productIdsForDeactivate,
              checkout_snapshot: checkoutSnapshot,
            },
            { onConflict: "draft_order_id" }
          );
      }
    }

    return NextResponse.json({ url: result.invoiceUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar pagamento." },
      { status: 500 }
    );
  }
}
