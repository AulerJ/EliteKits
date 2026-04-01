import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Package, User, MapPin, Phone, Mail, TrendingUp } from "lucide-react";
import { getOrders, getProductDetailsByIds, markOrderViewed } from "@/lib/admin/orders";
import { MarkViewedButton } from "./MarkViewedButton";

export const dynamic = "force-dynamic";

async function markViewedAction(orderId: string) {
  "use server";
  await markOrderViewed(orderId);
  revalidatePath("/admin/vendas");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMoney(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const c = currency ?? "usd";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: c.toUpperCase(),
  }).format(cents / 100);
}

export default async function AdminVendasPage() {
  const orders = await getOrders();
  const allIds = orders.flatMap((o) => o.product_ids);
  const productDetails = await getProductDetailsByIds(allIds);

  const newCount = orders.filter((o) => !o.admin_viewed_at).length;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.amount_total ?? 0), 0);
  const currency = orders[0]?.currency ?? "usd";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">Vendas</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendas/valor-estoque"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <TrendingUp className="h-4 w-4" />
            Valor do estoque (se vendesse tudo)
          </Link>
          {newCount > 0 && (
            <span className="rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
              {newCount} nova{newCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Total de pedidos</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900">{orders.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Faturamento</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {formatMoney(totalRevenue, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Não vistas</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{newCount}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <Package className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="mt-4 text-lg font-medium text-zinc-700">Nenhuma venda ainda</p>
          <p className="mt-2 text-sm text-zinc-500">
            Os pedidos aparecem aqui quando o pagamento é confirmado (catálogo via Shopify ou Stripe).
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {orders.map((order) => {
            const isNew = !order.admin_viewed_at;
            const meta = order.raw_metadata as Record<string, unknown>;
            const customerName = (meta.customer_name as string) || order.customer_email || "—";
            const customerPhone = (meta.customer_phone as string) || "—";
            const customerAddress = (meta.customer_address as string) || "";
            const customerEmail = order.customer_email ?? (typeof meta.customer_email === "string" ? meta.customer_email : null);
            const shippingLabel =
              order.shipping_preference === "pickup"
                ? "Retirada em Bridgeport, CT"
                : "Entrega pelos correios (prazo: 3 dias úteis)";

            return (
              <li
                key={order.id}
                className={`overflow-hidden rounded-2xl border-2 shadow-sm transition ${
                  isNew
                    ? "border-green-200 bg-gradient-to-br from-green-50/80 to-white"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${isNew ? "bg-green-50/50" : "bg-zinc-50/50"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    {isNew && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-medium text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        Novo
                      </span>
                    )}
                    <span className="font-semibold text-zinc-900">{customerName}</span>
                    <span className="text-sm text-zinc-500">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-600">
                      {formatMoney(order.amount_total, order.currency)}
                    </span>
                    {isNew && (
                      <MarkViewedButton orderId={order.id} markViewedAction={markViewedAction} />
                    )}
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:grid-cols-2">
                  <div className="space-y-4">
                    <section className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <User className="h-3.5 w-3.5" />
                        Cliente
                      </h3>
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500">Nome:</span>
                          <span className="text-zinc-900">{customerName}</span>
                        </div>
                        {customerEmail && (
                          <div className="flex items-start gap-2">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <a
                              href={`mailto:${customerEmail}`}
                              className="text-zinc-700 underline hover:text-zinc-900"
                            >
                              {customerEmail}
                            </a>
                          </div>
                        )}
                        {customerPhone !== "—" && customerPhone !== "" && (
                          <div className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <a
                              href={`tel:${customerPhone.replace(/\D/g, "")}`}
                              className="text-zinc-700 hover:text-zinc-900"
                            >
                              {customerPhone}
                            </a>
                          </div>
                        )}
                      </dl>
                    </section>
                    <section className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <MapPin className="h-3.5 w-3.5" />
                        Entrega
                      </h3>
                      <p className="text-sm font-medium text-zinc-800">{shippingLabel}</p>
                      {customerAddress.trim() && (
                        <p className="mt-1.5 text-sm text-zinc-600">{customerAddress}</p>
                      )}
                    </section>
                  </div>

                  <section className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <Package className="h-3.5 w-3.5" />
                      Itens
                    </h3>
                    <ul className="space-y-3">
                      {(() => {
                        const shopifyItems = meta.shopify_line_items;
                        const fromShopify =
                          Array.isArray(shopifyItems) &&
                          shopifyItems.length > 0 &&
                          shopifyItems.every(
                            (x: unknown) =>
                              x &&
                              typeof x === "object" &&
                              "product_id" in (x as object)
                          );
                        if (fromShopify) {
                          return (shopifyItems as {
                            product_id: string;
                            name: string | null;
                            size: string | null;
                            image_url: string | null;
                            quantity: number;
                            price: number | null;
                          }[]).map((item, idx) => {
                            const name = item.name?.trim() || "Produto";
                            const imageUrl = item.image_url?.trim() || null;
                            const qty = item.quantity > 1 ? item.quantity : 1;
                            return (
                              <li
                                key={`${item.product_id}-${idx}`}
                                className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
                              >
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={name}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                      <Package className="h-7 w-7" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-zinc-900">{name}</p>
                                  {item.size?.trim() && (
                                    <p className="mt-0.5 text-sm text-zinc-500">
                                      Tamanho: {item.size.trim()}
                                    </p>
                                  )}
                                  {qty > 1 && (
                                    <p className="mt-0.5 text-xs text-zinc-500">Qtd: {qty}</p>
                                  )}
                                  {item.price != null && item.price > 0 && (
                                    <p className="mt-0.5 text-sm font-medium text-green-700">
                                      US$ {Number(item.price).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </li>
                            );
                          });
                        }
                        if (order.product_ids.length === 0) {
                          return <li className="text-sm text-zinc-500">—</li>;
                        }
                        return order.product_ids.map((productId) => {
                          const detail = productDetails.get(productId);
                          const name = detail?.name ?? productId;
                          const size = detail?.size;
                          const imageUrl = detail?.imageUrl;
                          return (
                            <li
                              key={productId}
                              className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
                            >
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                    <Package className="h-7 w-7" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-zinc-900">{name}</p>
                                {size && (
                                  <p className="mt-0.5 text-sm text-zinc-500">Tamanho: {size}</p>
                                )}
                              </div>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </section>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
        Pedidos são gravados quando o pagamento é confirmado (webhook Shopify ou Stripe). Clique em
        &quot;Marcar como visto&quot; para que a venda deixe de aparecer como nova.
      </p>
    </div>
  );
}
