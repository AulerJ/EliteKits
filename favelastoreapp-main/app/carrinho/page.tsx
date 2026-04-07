"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { US_STATES, CT_TAX_RATE, isValidUSZip } from "@/lib/us-states";
import { siteDisplayName } from "@/lib/site-brand";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

type ShippingMethod = "pickup" | "delivery";

const DELIVERY_FEE = 9;
const OWNER_WHATSAPP = "12033947243";

export default function CarrinhoPage() {
  const ac = publicStorefrontAccent();
  const { items, subtotal, totalItems, removeItem, clearCart } = useCart();
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("delivery");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const shippingCost = shippingMethod === "delivery" ? DELIVERY_FEE : 0;
  const taxableAmount = subtotal + shippingCost;
  const chargeTax = shippingMethod === "pickup" || shippingMethod === "delivery";
  const taxAmount = chargeTax ? taxableAmount * CT_TAX_RATE : 0;
  const total = taxableAmount + taxAmount;

  const fullAddress =
    [addressStreet, addressCity, addressState, addressZip].filter(Boolean).join(", ") || "";

  function validateAddress(): string | null {
    if (shippingMethod === "pickup") return null;
    const street = addressStreet.trim();
    const city = addressCity.trim();
    const state = addressState.trim();
    const zip = addressZip.trim();
    if (!street || street.length < 5) return "Informe o endereço completo (rua e número).";
    if (!city || city.length < 2) return "Informe a cidade.";
    if (!state) return "Selecione o estado (apenas entrega nos EUA).";
    if (!zip) return "Informe o CEP (ZIP code).";
    if (!isValidUSZip(zip)) return "CEP inválido. Use 5 dígitos (ex: 06604) ou 5+4 (ex: 06604-1234).";
    return null;
  }

  function buildWhatsappMessage() {
    const brand = siteDisplayName();
    const lines: string[] = [];
    lines.push(`Oi, acabei de fazer um pedido no site ${brand}.`);
    lines.push("");
    if (name.trim()) lines.push(`Nome: ${name.trim()}`);
    if (email.trim()) lines.push(`Email: ${email.trim()}`);
    if (phone.trim()) lines.push(`Telefone: ${phone.trim()}`);
    lines.push(
      `Entrega: ${
        shippingMethod === "delivery"
          ? "Entrega pelos correios (US$ 9.00) — prazo 3 dias úteis"
          : "Retirar em Bridgeport (grátis)"
      }`
    );
    if (shippingMethod === "delivery" && fullAddress) {
      lines.push(`Endereço: ${fullAddress}`);
    }
    lines.push("");
    lines.push("Itens:");
    items.forEach((item) => {
      const nameLabel =
        item.name?.trim() && !item.name.match(/^produto\s*-?\s*\d+$/i)
          ? item.name.trim()
          : "Produto";
      const qtyLabel = item.quantity > 1 ? ` (${item.quantity} unidades)` : "";
      const sizeLabel = item.size ? ` (Tamanho: ${item.size})` : "";
      const priceLabel =
        item.price != null ? ` - US$ ${Number(item.price).toFixed(2)}` : "";
      lines.push(`- ${nameLabel}${qtyLabel}${sizeLabel}${priceLabel}`);
    });
    lines.push("");
    lines.push(`Total estimado: US$ ${total.toFixed(2)}`);
    lines.push("");
    lines.push("Vou enviar o comprovante do pagamento por aqui. 🙂");
    return lines.join("\n");
  }

  function handleSendWhatsapp() {
    setError("");
    if (!items.length) {
      setError("Seu carrinho está vazio.");
      return;
    }
    if (!name.trim()) {
      setError("Informe seu nome antes de enviar pelo WhatsApp.");
      return;
    }
    const message = buildWhatsappMessage();
    const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  async function submitCheckout(apiUrl: string) {
    setError("");
    if (!items.length) {
      setError("Seu carrinho está vazio.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Informe nome e email.");
      return;
    }
    const addressErr = validateAddress();
    if (addressErr) {
      setError(addressErr);
      return;
    }

    const payload = {
      items,
      customer: {
        name,
        email,
        phone,
        addressStreet: addressStreet.trim(),
        addressCity: addressCity.trim(),
        addressState: addressState.trim(),
        addressZip: addressZip.trim(),
      },
      shippingMethod,
    };

    try {
      setLoading(true);
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Não foi possível iniciar o pagamento.");
      }
      const data = (await res.json()) as { url: string };
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        throw new Error("Resposta inválida do provedor de pagamento.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    submitCheckout("/api/checkout-shopify");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row">
        <section className="flex-1">
          <Link
            href="/"
            className="mb-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Voltar ao catálogo
          </Link>

          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            Seu carrinho
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {totalItems === 0
              ? "Nenhum item no carrinho."
              : `${totalItems} item${totalItems > 1 ? "s" : ""} no carrinho.`}
          </p>

          {items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-600">
                Seu carrinho está vazio. Explore o catálogo para adicionar produtos.
              </p>
              <Link
                href="/"
                className={ac.carrinhoBtn}
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-stretch gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name?.trim() || "Produto"}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900">
                      {item.name?.trim() && !item.name.match(/^produto\s*-?\s*\d+$/i)
                        ? item.name
                        : "Produto"}
                    </p>
                    {item.quantity > 1 && (
                      <p className="mt-0.5 text-xs font-medium text-zinc-600">
                        {item.quantity} unidades
                      </p>
                    )}
                    {item.size && (
                      <p className="mt-0.5 text-xs font-medium text-zinc-600">
                        Tamanho: {item.size}
                      </p>
                    )}
                    {item.price != null && (
                      <p className={`mt-1 text-sm font-semibold ${ac.price}`}>
                        US$ {Number(item.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="self-center text-xs font-medium text-red-600 hover:text-red-500"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="w-full max-w-md self-start rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Finalizar compra
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Entrega apenas nos EUA. Pagamento seguro via Shopify (cartão, Apple Pay, etc.).
          </p>

          <form onSubmit={handleCheckout} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Telefone (WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                placeholder="(203) 555-1234"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-800">
                Entrega ou retirada
              </p>
              <div className="mt-2 space-y-2 rounded-xl bg-zinc-50 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100">
                  <span className="flex items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="radio"
                      name="shipping"
                      value="delivery"
                      checked={shippingMethod === "delivery"}
                      onChange={() => setShippingMethod("delivery")}
                      className={ac.checkbox}
                    />
                    <span>
                      Entrega (US$ 9.00) — apenas EUA
                      <span className="block text-xs font-normal text-zinc-500">
                        Prazo: 3 dias úteis
                      </span>
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100">
                  <span className="flex items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="radio"
                      name="shipping"
                      value="pickup"
                      checked={shippingMethod === "pickup"}
                      onChange={() => setShippingMethod("pickup")}
                      className={ac.checkbox}
                    />
                    Retirar em Bridgeport, CT (grátis)
                  </span>
                </label>
              </div>
            </div>

            {shippingMethod === "delivery" && (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
                <p className="text-xs font-medium text-zinc-700">
                  Endereço completo (apenas EUA)
                </p>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Rua e número *
                  </label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                    placeholder="123 Main St, Apt 4"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                      placeholder="Bridgeport"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Estado *
                    </label>
                    <select
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                    >
                      <option value="">Selecione</option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    CEP (ZIP) *
                  </label>
                  <input
                    type="text"
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className={`mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${ac.focusInput}`}
                    placeholder="06604"
                    maxLength={10}
                  />
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    5 dígitos ou 5+4 (ex: 06604)
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-1 text-sm text-zinc-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>US$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>
                  {shippingMethod === "delivery"
                    ? "US$ " + DELIVERY_FEE.toFixed(2)
                    : "Grátis (retirada)"}
                </span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>US$ {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-dashed border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
                <span>Total</span>
                <span className={ac.totalPrice}>US$ {total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className={ac.carrinhoCheckout}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando para pagamento...
                </>
              ) : (
                "Finalizar pedido"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSendWhatsapp}
            disabled={items.length === 0}
            className={ac.borderBtn}
          >
            Comprar pelo WhatsApp
          </button>

        </section>
      </div>
    </main>
  );
}
