"use client";

import { useEffect } from "react";

const STORAGE_NAV_IDS = "favelastore_product_nav_ids";
const STORAGE_BUSCA_IDS = "favelastore_busca_ids";

/**
 * Grava na sessionStorage a lista [productId, ...otherIds] para o ProductPageNav e o swipe.
 * Só atualiza a lista quando o produto atual ainda NÃO está na lista (ex.: acabou de abrir vindo do catálogo).
 * Se já está na lista (ex.: passou pelo "Próximo" ou swipe), mantém a lista para não ficar em loop entre 2 produtos.
 */
export function ProductPageNavSync({
  productId,
  otherIds,
}: {
  productId: string;
  otherIds: string[];
}) {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const buscaRaw = sessionStorage.getItem(STORAGE_BUSCA_IDS);
      const buscaIds: string[] = buscaRaw ? JSON.parse(buscaRaw) : [];
      if (buscaIds.includes(productId)) return;
      const navRaw = sessionStorage.getItem(STORAGE_NAV_IDS);
      const navIds: string[] = navRaw ? JSON.parse(navRaw) : [];
      if (navIds.includes(productId)) return;
      const list = [productId, ...otherIds];
      sessionStorage.setItem(STORAGE_NAV_IDS, JSON.stringify(list));
    } catch {
      // ignore
    }
  }, [productId, otherIds]);
  return null;
}
