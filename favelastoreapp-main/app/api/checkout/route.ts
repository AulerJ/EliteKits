import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CT_TAX_RATE } from "@/lib/us-states";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// Deve ser a URL do app onde está esta página (ex: https://catalogo.favelastore.com).
// No Vercel: Settings → Environment Variables → NEXT_PUBLIC_SITE_URL = essa URL (senão cai no site errado após pagar).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";

if (!stripeSecretKey && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "[checkout] STRIPE_SECRET_KEY não configurada. Configure no .env.local para ativar o pagamento online."
  );
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-02-25.clover",
    })
  : null;

/** Preço do item em DÓLARES (ex: 1.06), não em centavos. O Stripe recebe em centavos internamente. */
type CheckoutItem = {
  id: string;
  name: string | null;
  price: number | null;
  quantity: number;
  imageUrl?: string | null;
  size?: string | null;
};

export async function POST(req: NextRequest) {
  // Pagamento agora é só pela Shopify. Esta rota não deve ser usada.
  return NextResponse.json(
    {
      error:
        "O pagamento passou a ser feito só pela Shopify. Use o botão Finalizar pedido no carrinho (você será redirecionado para a Shopify). Se o problema continuar, atualize a página ou limpe o cache do navegador.",
    },
    { status: 410 }
  );

  /* Código Stripe desativado — descomente apenas se voltar a usar Stripe
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Pagamento online não está configurado. Peça ao administrador para definir STRIPE_SECRET_KEY no .env.local.",
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

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validItems.map((item) => {
      const unitAmount =
        typeof item.price === "number" && item.price > 0
          ? Math.round(item.price * 100)
          : 0;
      const productName =
        item.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(item.name)
          ? item.name.trim()
          : `Produto ${process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "EliteKits"}`;
      const imageUrl = typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl.trim() : undefined;
      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: productName,
            ...(imageUrl ? { images: [imageUrl] } : {}),
            metadata: {
              product_id: item.id,
              ...(item.size ? { size: item.size } : {}),
            },
          },
        },
      };
    });

    const shippingMethod = body.shippingMethod === "pickup" ? "pickup" : "delivery";
    const chargeTax = shippingMethod === "pickup" || shippingMethod === "delivery";

    const subtotalCents = validItems.reduce((acc, item) => {
      const p = typeof item.price === "number" && item.price > 0 ? item.price : 0;
      return acc + Math.round(p * 100) * item.quantity;
    }, 0);
    const shippingCents = shippingMethod === "delivery" ? 900 : 0;
    const taxableCents = subtotalCents + shippingCents;
    const taxCents = chargeTax ? Math.round(taxableCents * CT_TAX_RATE) : 0;

    // Não mostrar Tax como item separado: incorporar no frete (entrega) ou no primeiro produto (retirada)
    if (shippingMethod === "pickup" && taxCents > 0 && lineItems.length > 0) {
      const first = lineItems[0];
      const pd = first.price_data as unknown as { currency: string; unit_amount: number; product_data: Record<string, unknown> };
      pd.unit_amount = (pd.unit_amount ?? 0) + taxCents;
    }

    const shippingCentsForLineItem = shippingMethod === "delivery" ? 900 + taxCents : 0;
    if (shippingCentsForLineItem > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shippingCentsForLineItem,
          product_data: {
            name: "Entrega pelos correios (prazo: 3 dias úteis)",
            description: "Shipping",
          },
        },
      });
    }

    const fullAddress = [
      body.customer?.addressStreet,
      body.customer?.addressCity,
      body.customer?.addressState,
      body.customer?.addressZip,
    ]
      .filter(Boolean)
      .join(", ");

    const hasCustomerData =
      body.customer?.email?.trim() &&
      body.customer?.name?.trim() &&
      (shippingMethod === "pickup" ||
        (body.customer?.addressStreet?.trim() &&
          body.customer?.addressCity?.trim() &&
          body.customer?.addressState?.trim() &&
          body.customer?.addressZip?.trim()));

    let customerId: string | undefined;
    if (hasCustomerData && body.customer?.email) {
      const customer = await stripe.customers.create({
        email: body.customer.email.trim(),
        name: body.customer.name?.trim() || undefined,
        address:
          shippingMethod === "delivery" &&
          body.customer?.addressStreet &&
          body.customer?.addressCity &&
          body.customer?.addressState &&
          body.customer?.addressZip
            ? {
                line1: body.customer.addressStreet.trim(),
                city: body.customer.addressCity.trim(),
                state: body.customer.addressState.trim(),
                postal_code: body.customer.addressZip.trim(),
                country: "US",
              }
            : undefined,
        metadata: { phone: body.customer.phone?.trim() || "" },
      });
      customerId = customer.id;
    }

    const productIdsForMetadata = validItems.map((i) => i.id);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteUrl}/pedido-confirmado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/carrinho?checkout=cancelled`,
      ...(customerId ? { customer: customerId } : { customer_email: body.customer?.email || undefined }),
      metadata: {
        customer_name: body.customer?.name || "",
        customer_phone: body.customer?.phone || "",
        customer_address: fullAddress || "",
        shipping_preference: shippingMethod,
        product_ids: JSON.stringify(productIdsForMetadata),
      },
    };

    // Não coletar endereço de novo no Stripe; envio já veio do carrinho
    if (
      shippingMethod === "delivery" &&
      body.customer?.name?.trim() &&
      body.customer?.addressStreet?.trim() &&
      body.customer?.addressCity?.trim() &&
      body.customer?.addressState?.trim() &&
      body.customer?.addressZip?.trim()
    ) {
      sessionParams.payment_intent_data = {
        shipping: {
          name: body.customer.name.trim(),
          address: {
            line1: body.customer.addressStreet.trim(),
            city: body.customer.addressCity.trim(),
            state: body.customer.addressState.trim(),
            postal_code: body.customer.addressZip.trim(),
            country: "US",
          },
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Garantir que o Stripe cobrou exatamente o total que calculamos (preços em dólares no carrinho)
    const expectedTotalCents = subtotalCents + shippingCents + taxCents;
    if (session.amount_total != null && session.amount_total !== expectedTotalCents) {
      // eslint-disable-next-line no-console
      console.error(
        "[checkout] Total divergente: esperado",
        expectedTotalCents,
        "cents (US$",
        (expectedTotalCents / 100).toFixed(2),
        "), Stripe retornou",
        session.amount_total,
        "cents. Items:",
        JSON.stringify(validItems.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })))
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Checkout error:", err);
    return NextResponse.json(
      {
        error:
          "Erro ao iniciar pagamento. Tente novamente ou entre em contato pelo WhatsApp.",
      },
      { status: 500 }
    );
  }
  */
}
