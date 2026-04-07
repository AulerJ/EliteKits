"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

interface AddToCartButtonProps {
  productId: string;
  name: string | null;
  price: number | null;
  imageUrl: string | null;
  size: string | null;
  /** Se > 1, mostra seletor de quantidade. Se null/undefined/1, só adiciona 1. */
  stock?: number | null;
}

export function AddToCartButton({
  productId,
  name,
  price,
  imageUrl,
  size,
  stock,
}: AddToCartButtonProps) {
  const ac = publicStorefrontAccent();
  const { addItem, items } = useCart();
  const canSelectQty = (stock ?? 1) > 1;
  const [qty, setQty] = useState(1);
  const cartLineId = size ? `${productId}__${size}` : productId;
  const inCart = items.find((i) => i.id === cartLineId);
  const maxStock = stock ?? 1;
  const alreadyAtMax = maxStock <= 1 && inCart && inCart.quantity >= 1;

  function handleAdd() {
    if (alreadyAtMax) return;
    addItem(
      {
        id: cartLineId,
        name,
        price,
        imageUrl,
        size,
      },
      canSelectQty ? qty : 1,
      stock ?? null
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canSelectQty && (
        <div className="flex items-center gap-2">
          <label htmlFor="qty-select" className="text-sm font-medium text-zinc-700">
            Qtd
          </label>
          <input
            id="qty-select"
            type="number"
            min={1}
            max={stock ?? 999}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(stock ?? 999, parseInt(e.target.value, 10) || 1)))}
            className={`h-10 w-14 rounded-lg border border-zinc-300 px-2 text-center text-sm font-medium ${ac.focusInput}`}
          />
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={alreadyAtMax}
        className={`inline-flex flex-1 min-w-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-initial sm:px-5 ${
          alreadyAtMax
            ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
            : ac.addToCartMain
        }`}
      >
        <ShoppingCart className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {alreadyAtMax
            ? "Já no carrinho"
            : canSelectQty && qty > 1
              ? `Adicionar ${qty} ao carrinho`
              : "Adicionar ao carrinho"}
        </span>
      </button>
    </div>
  );
}
