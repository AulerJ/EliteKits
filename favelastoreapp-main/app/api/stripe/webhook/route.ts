import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const storeOwnerEmail = process.env.STORE_OWNER_EMAIL;
const resendApiKey = process.env.RESEND_API_KEY;

const stripe =
  stripeSecretKey && webhookSecret
    ? new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" })
    : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook não configurado." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Erro ao verificar webhook Stripe:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: ["data.price.product"],
        }
      );

      const productIds = new Set<string>();
      for (const item of lineItems.data) {
        const product = item.price?.product as Stripe.Product | null;
        const pid = product && typeof product === "object" && "metadata" in product
          ? (product.metadata?.product_id as string | undefined)
          : undefined;
        if (pid && typeof pid === "string") {
          productIds.add(pid);
        }
      }
      // Fallback: IDs dos produtos no metadata da sessão (garante desativar mesmo se Stripe não devolver nos line items)
      const metaProductIds = session.metadata?.product_ids;
      if (typeof metaProductIds === "string" && metaProductIds) {
        try {
          const ids = JSON.parse(metaProductIds) as unknown;
          if (Array.isArray(ids)) {
            for (const id of ids) {
              if (typeof id === "string" && id.trim()) productIds.add(id.trim());
            }
          }
        } catch {
          // ignore
        }
      }

      const supabase = createServiceRoleClient();
      if (!supabase) {
        console.error(
          "[webhook] SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel. Pedido não salvo e produtos não desativados. Adicione a chave em Settings → Environment Variables."
        );
        return NextResponse.json(
          { error: "Supabase não configurado para webhook." },
          { status: 500 }
        );
      }
      if (productIds.size > 0) {
        try {
          const { error: updateErr } = await supabase
            .schema("favelastore")
            .from("products")
            .update({ is_active: false })
            .in("id", Array.from(productIds));
          if (updateErr) {
            console.error("Erro ao atualizar produtos no webhook:", updateErr);
          }
        } catch (err) {
          console.error("Erro ao atualizar produtos no webhook:", err);
        }
      }
      try {
        const { error: insertErr } = await supabase
          .schema("favelastore")
          .from("orders")
          .insert({
            stripe_session_id: session.id,
            customer_email: session.customer_email ?? (session.metadata?.customer_email as string) ?? null,
            amount_total: session.amount_total,
            currency: session.currency,
            shipping_preference:
              (session.metadata?.shipping_preference as string | undefined) ?? null,
            product_ids: Array.from(productIds),
            raw_metadata: session.metadata ?? {},
          });
        if (insertErr) {
          console.error("Erro ao salvar pedido (orders):", insertErr.code, insertErr.message);
          const isDuplicate = insertErr.code === "23505";
          if (isDuplicate) {
            return NextResponse.json({ received: true });
          }
          return NextResponse.json(
            { error: "Falha ao salvar pedido no banco." },
            { status: 500 }
          );
        }
      } catch (err) {
        console.error("Erro ao salvar pedido (orders):", err);
        return NextResponse.json(
          { error: "Falha ao salvar pedido no banco." },
          { status: 500 }
        );
      }

      // Email para o dono da loja: novo pedido (sempre tenta, mesmo se Supabase falhar)
      if (!storeOwnerEmail || !resend) {
        // eslint-disable-next-line no-console
        console.warn(
          "[webhook] Email de novo pedido não enviado: STORE_OWNER_EMAIL ou RESEND_API_KEY ausente no Vercel."
        );
      }
      if (storeOwnerEmail && resend) {
        const meta = session.metadata ?? {};
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";
        const logoUrl = `${siteUrl.replace(/\/$/, "")}/logo.png`;
        const totalFormatted =
          session.amount_total != null
            ? `$${(session.amount_total / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`
            : "—";

        const isPaymentExtra = (name: string) =>
          name === "Tax" || name.startsWith("Entrega") || name.startsWith("Retirar em");

        const productItems = lineItems.data.filter((item) => {
          const product = item.price?.product;
          const name =
            product && typeof product === "object" && "name" in product
              ? (product as { name: string }).name
              : item.description ?? "";
          return !isPaymentExtra(name);
        });
        const paymentExtras = lineItems.data.filter((item) => {
          const product = item.price?.product;
          const name =
            product && typeof product === "object" && "name" in product
              ? (product as { name: string }).name
              : item.description ?? "";
          return isPaymentExtra(name);
        });

        const productRows = productItems
          .map((item) => {
            const product = item.price?.product;
            const name =
              product && typeof product === "object" && "name" in product
                ? (product as { name: string }).name
                : item.description ?? "Item";
            const imgUrl =
              product && typeof product === "object" && "images" in product && Array.isArray((product as { images?: string[] }).images) && (product as { images: string[] }).images[0]
                ? (product as { images: string[] }).images[0]
                : null;
            const qty = item.quantity ?? 1;
            const lineTotal =
              item.amount_total != null ? `$${(item.amount_total / 100).toFixed(2)}` : "—";
            return `
  <tr>
    <td style="padding:12px 10px;vertical-align:middle;border-bottom:1px solid #e5e7eb;">
      <img src="${imgUrl || logoUrl}" alt="" width="56" height="56" style="object-fit:cover;border-radius:8px;display:block;" />
    </td>
    <td style="padding:12px 10px;vertical-align:middle;border-bottom:1px solid #e5e7eb;">
      <span style="font-weight:600;color:#18181b;">${escapeHtml(name)}</span>
      <span style="color:#71717a;"> × ${qty}</span>
    </td>
    <td style="padding:12px 10px;vertical-align:middle;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#166534;">${lineTotal}</td>
  </tr>`;
          })
          .join("");

        const paymentExtrasRows = paymentExtras
          .map((item) => {
            const product = item.price?.product;
            const name =
              product && typeof product === "object" && "name" in product
                ? (product as { name: string }).name
                : item.description ?? "Item";
            const lineTotal =
              item.amount_total != null ? `$${(item.amount_total / 100).toFixed(2)}` : "—";
            return `
  <tr>
    <td style="padding:6px 0;color:#52525b;">${escapeHtml(name)}</td>
    <td style="padding:6px 0;text-align:right;color:#18181b;">${lineTotal}</td>
  </tr>`;
          })
          .join("");

        const customerName = (meta.customer_name as string) || "—";
        const customerEmailVal = session.customer_email ?? (meta.customer_email as string) ?? "—";
        const customerPhone = (meta.customer_phone as string) || "—";
        const shippingText =
          (meta.shipping_preference as string) === "pickup"
            ? "Retirada em Bridgeport, CT"
            : "Entrega pelos correios (prazo: 3 dias úteis)";
        const customerAddress = (meta.customer_address as string) || "";

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo pedido – Favela Store</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <!-- Header com logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#166534 0%,#15803d 100%);padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Favela Store" width="80" height="80" style="display:inline-block;border-radius:12px;background:#fff;padding:6px;box-sizing:border-box;" />
              <h1 style="margin:16px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Novo pedido</h1>
              <p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Um cliente acabou de finalizar uma compra.</p>
            </td>
          </tr>
          <!-- Cliente -->
          <tr>
            <td style="padding:20px 24px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border-radius:12px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;">Cliente</p>
                    <p style="margin:0;font-size:15px;color:#18181b;line-height:1.5;"><strong>${escapeHtml(customerName)}</strong></p>
                    <p style="margin:4px 0 0;font-size:14px;color:#52525b;">${escapeHtml(customerEmailVal)}</p>
                    <p style="margin:2px 0 0;font-size:14px;color:#52525b;">${escapeHtml(customerPhone)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Entrega -->
          <tr>
            <td style="padding:16px 24px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border-radius:12px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;">Entrega</p>
                    <p style="margin:0;font-size:14px;color:#18181b;">${escapeHtml(shippingText)}</p>
                    ${customerAddress ? `<p style="margin:8px 0 0;font-size:14px;color:#52525b;">${escapeHtml(customerAddress)}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Itens -->
          <tr>
            <td style="padding:20px 24px 0;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;">Resumo do pedido</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                ${productRows || `<tr><td style="padding:16px;color:#71717a;">Nenhum item</td></tr>`}
              </table>
            </td>
          </tr>
          <!-- Pagamento (tax, entrega, total) -->
          <tr>
            <td style="padding:20px 24px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${paymentExtrasRows}
                      <tr>
                        <td style="padding:12px 0 0;border-top:1px solid #86efac;font-weight:700;font-size:16px;color:#166534;">Total pago</td>
                        <td style="padding:12px 0 0;border-top:1px solid #86efac;text-align:right;font-weight:700;font-size:16px;color:#166534;">${totalFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 20px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#18181b;">Favela Store</p>
              <p style="margin:4px 0 0;font-size:11px;color:#a1a1aa;">Camisas de time e acessórios</p>
              <p style="margin:12px 0 0;font-size:10px;color:#d4d4d8;font-family:monospace;">${session.id}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
        try {
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "Favela Store <onboarding@resend.dev>",
            to: [storeOwnerEmail],
            subject: `Novo pedido Favela Store – ${(meta.customer_name as string) || session.customer_email || session.id}`,
            html,
          });
          if (error) {
            // eslint-disable-next-line no-console
            console.error("[webhook] Resend retornou erro:", error);
          }
        } catch (emailErr) {
          // eslint-disable-next-line no-console
          console.error("[webhook] Erro ao enviar email de novo pedido:", emailErr);
        }
      }
    } catch (err) {
      console.error("Erro ao processar checkout.session.completed:", err);
      return NextResponse.json({ received: true });
    }
  }

  return NextResponse.json({ received: true });
}

