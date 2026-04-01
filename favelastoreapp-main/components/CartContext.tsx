"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  name: string | null;
  price: number | null;
  size: string | null;
  imageUrl?: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number, stock?: number | null) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "favelastore_cart_v1";

function loadInitialCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items = (parsed as unknown[])
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const { id, name, price, imageUrl, quantity, size } = item as Partial<CartItem>;
        if (!id || typeof id !== "string") return null;
        const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
        return {
          id,
          name: typeof name === "string" || name === null ? name ?? null : null,
          price: typeof price === "number" || price === null ? price ?? null : null,
          size: typeof size === "string" || size === null ? size ?? null : null,
          imageUrl: typeof imageUrl === "string" || imageUrl === null ? imageUrl ?? null : null,
          quantity: qty,
        } satisfies CartItem;
      })
      .filter((i) => i !== null) as CartItem[];

    return items;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Carregar do localStorage apenas no client
  useEffect(() => {
    setItems(loadInitialCart());
  }, []);

  // Salvar sempre que mudar
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1, stock?: number | null) => {
      if (!item.id) return;
      const maxQty = (stock ?? 1) <= 1 ? 1 : (stock ?? 999);
      const qty = Math.max(1, Math.min(maxQty, Math.floor(quantity)));
      setItems((current) => {
        const existing = current.find((c) => c.id === item.id);
        if (existing) {
          if (maxQty <= 1) return current;
          const newQty = Math.min(maxQty, existing.quantity + qty);
          return current.map((c) =>
            c.id === item.id ? { ...c, quantity: newQty } : c
          );
        }
        return [...current, { ...item, quantity: qty }];
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((c) => c.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) =>
      current
        .map((c) => (c.id === id ? { ...c, quantity } : c))
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const { totalItems, subtotal } = useMemo(() => {
    let itemsCount = 0;
    let subtotalValue = 0;
    for (const item of items) {
      itemsCount += item.quantity;
      if (item.price != null) {
        subtotalValue += item.price * item.quantity;
      }
    }
    return { totalItems: itemsCount, subtotal: subtotalValue };
  }, [items]);

  const value: CartContextValue = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return ctx;
}

