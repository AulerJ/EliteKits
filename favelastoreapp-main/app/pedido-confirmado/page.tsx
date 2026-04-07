import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, MessageCircle, Package, User, MapPin } from "lucide-react";
import { stripeServer } from "@/lib/stripe-server";
import { siteDisplayName } from "@/lib/site-brand";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://catalogo.favelastore.com";

type Props = { searchParams: Promise<{ session_id?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const brand = siteDisplayName();
  const params = await searchParams;
  const sessionId = params.session_id ?? "";
  let imageUrl: string | null = null;
  if (sessionId && stripeServer) {
    try {
      const items = await stripeServer.checkout.sessions.listLineItems(sessionId, {
        expand: ["data.price.product"],
        limit: 1,
      });
      const product = items.data[0]?.price?.product;
      if (product && typeof product === "object" && "images" in product && Array.isArray((product as { images?: string[] }).images)) {
        const first = (product as { images: string[] }).images[0];
        if (typeof first === "string") imageUrl = first;
      }
    } catch {
      // ignore
    }
  }
  const title = `Compra confirmada – ${brand}`;
  const description = "Obrigado pelo seu pedido.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/pedido-confirmado${sessionId ? `?session_id=${sessionId}` : ""}`,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 400, height: 400, alt: "Produto" }] } : {}),
    },
  };
}

const OWNER_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "12033947243";

function formatMoney(cents: number, currency: string = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function getProductName(item: { description?: string | null; price?: { product?: unknown } | null }): string {
  const product = item.price?.product;
  if (product && typeof product === "object" && "name" in product && typeof (product as { name: string }).name === "string") {
    return (product as { name: string }).name;
  }
  return item.description?.trim() || "Item";
}

function getProductImage(product: unknown): string | null {
  if (product && typeof product === "object" && "images" in product && Array.isArray((product as { images?: string[] }).images)) {
    const first = (product as { images: string[] }).images[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

function getProductSize(product: unknown): string | null {
  if (product && typeof product === "object" && "metadata" in product && (product as { metadata?: Record<string, string> }).metadata?.size) {
    return (product as { metadata: { size: string } }).metadata.size;
  }
  return null;
}

export default async function PedidoConfirmadoPage({ searchParams }: Props) {
  const ac = publicStorefrontAccent();
  const brand = siteDisplayName();
  const params = await searchParams;
  const sessionId = params.session_id ?? "";

  // Resumo do pedido: só preenchido se vier session_id do Stripe (links antigos). Hoje o pagamento é só via Shopify.
  type SessionLike = { metadata?: Record<string, unknown> | null; customer_email?: string | null; amount_total?: number | null; currency?: string | null } | null;
  let session: SessionLike = null;
  let lineItems: { name: string; quantity: number; unitAmount: number; totalAmount: number; imageUrl: string | null; size: string | null }[] = [];

  if (sessionId && stripeServer) {
    try {
      const retrieved = await stripeServer.checkout.sessions.retrieve(sessionId);
      session = retrieved as SessionLike;
      const items = await stripeServer.checkout.sessions.listLineItems(sessionId, {
        expand: ["data.price.product"],
      });
      lineItems = items.data.map((item) => {
        const product = item.price?.product;
        const name = getProductName(item);
        const qty = item.quantity ?? 1;
        const total = item.amount_total ?? 0;
        const unit = item.price?.unit_amount ?? 0;
        const imageUrl = getProductImage(product);
        const size = getProductSize(product);
        return { name, quantity: qty, unitAmount: unit, totalAmount: total, imageUrl, size };
      });
    } catch {
      // session inválido ou expirado
    }
  }

  const hasStripeData = session && lineItems.length > 0;
  const receiptUrl = sessionId ? `${SITE_URL}/pedido-confirmado?session_id=${sessionId}` : "";

  const isPaymentExtra = (name: string) =>
    name === "Tax" ||
    name.startsWith("Entrega") ||
    name.startsWith("Retirar em");
  const productItems = lineItems.filter((item) => !isPaymentExtra(item.name));
  const paymentExtras = lineItems.filter((item) => isPaymentExtra(item.name));

  const meta = session?.metadata ?? {};
  const customerName = (meta.customer_name as string) || "";
  const customerEmail = session?.customer_email ?? (meta.customer_email as string) ?? "";
  const customerPhone = (meta.customer_phone as string) || "";
  const customerAddress = (meta.customer_address as string) || "";
  const shippingPref = (meta.shipping_preference as string) || "";
  const totalPaid = session?.amount_total ?? 0;
  const currency = session?.currency ?? "usd";

  const waLines: string[] = [
    `Oi! Acabei de fazer uma compra na ${brand}.`,
    "",
    sessionId ? `📋 Nº do pedido: ${sessionId}` : "Pagamento feito na Shopify.",
    "",
    "👤 *Dados:*",
    customerName ? `Nome: ${customerName}` : "",
    customerEmail ? `Email: ${customerEmail}` : "",
    customerPhone ? `Telefone: ${customerPhone}` : "",
    "",
    "📍 *Entrega:*",
    shippingPref === "pickup" ? "Retirada em Bridgeport, CT" : "Entrega pelos correios (prazo: 3 dias úteis)",
    customerAddress ? `Endereço: ${customerAddress}` : "",
    "",
    "🛒 *Itens:*",
  ];
  productItems.forEach((item) => {
    waLines.push(`• ${item.name} × ${item.quantity} – ${formatMoney(item.totalAmount, currency)}`);
  });
  if (totalPaid > 0) waLines.push("", `💰 *Total pago: ${formatMoney(totalPaid, currency)}*`, "");
  if (receiptUrl) waLines.push("", `📄 Recibo: ${receiptUrl}`);
  waLines.push("", "Pode confirmar? 🙂");

  const waMessage = waLines.filter(Boolean).join("\n");
  const waUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(waMessage)}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className={ac.pedidoHeader}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">Compra confirmada!</h1>
          <p className={ac.pedidoSub}>
            {hasStripeData ? "Obrigado pelo seu pedido." : "Obrigado! Seu pagamento foi processado na Shopify."}
          </p>
          {sessionId && hasStripeData && (
            <p className={ac.pedidoMono}>Pedido #{sessionId.replace("cs_test_", "").slice(0, 12)}…</p>
          )}
          {!hasStripeData && (
            <p className={ac.pedidoNote}>Confira o email de confirmação da Shopify.</p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {productItems.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Package className="h-4 w-4" />
                Resumo do pedido
              </h2>
              <ul className="mt-3 divide-y divide-zinc-100">
                {productItems.map((item, i) => (
                  <li key={i} className="flex gap-3 py-3 text-sm">
                    {item.imageUrl ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-zinc-800">{item.name}</span>
                      {item.size && <span className="ml-1 text-zinc-500">({item.size})</span>}
                      <span className="text-zinc-500"> × {item.quantity}</span>
                    </div>
                    <span className="font-medium text-zinc-900 shrink-0">{formatMoney(item.totalAmount, currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasStripeData && (customerName || customerEmail || customerPhone || customerAddress || shippingPref) && (
            <section className="rounded-xl bg-zinc-50 p-4 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <User className="h-4 w-4" />
                Dados e entrega
              </h2>
              <div className="text-sm text-zinc-600 space-y-1">
                {customerName && <p><strong>Nome:</strong> {customerName}</p>}
                {customerEmail && <p><strong>Email:</strong> {customerEmail}</p>}
                {customerPhone && <p><strong>Telefone:</strong> {customerPhone}</p>}
                <p>
                  <strong>Entrega:</strong>{" "}
                  {shippingPref === "pickup" ? "Retirada em Bridgeport, CT" : "Entrega pelos correios (prazo: 3 dias úteis)"}
                </p>
                {customerAddress && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{customerAddress}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          {(hasStripeData && (paymentExtras.length > 0 || totalPaid > 0)) && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Pagamento</h2>
              {paymentExtras.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-zinc-700">
                  <span>{item.name}</span>
                  <span>{formatMoney(item.totalAmount, currency)}</span>
                </div>
              ))}
              {totalPaid > 0 && (
                <div className="flex justify-between items-center border-t border-zinc-200 pt-3 mt-1">
                  <span className="font-semibold text-zinc-900">Total pago</span>
                  <span className={ac.pedidoTotal}>{formatMoney(totalPaid, currency)}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-zinc-500 text-center">
            {hasStripeData
              ? "Envie uma mensagem ou comprovante pelo WhatsApp para confirmar."
              : "Quer falar conosco? Envie uma mensagem pelo WhatsApp."}
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ac.pedidoWhatsApp}
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Enviar no WhatsApp
          </a>
          <Link
            href="/"
            className="block text-center text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
          >
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
