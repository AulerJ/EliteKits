"use client";

import { useEffect, useState } from "react";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

/**
 * Quando a Shopify redireciona para o site após instalar o app (URL com shop= e hmac=),
 * mostra um aviso breve e opcionalmente limpa a URL.
 */
export function ShopifyInstallBanner() {
  const ac = publicStorefrontAccent();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const hmac = params.get("hmac");
    if (shop && hmac) {
      setShow(true);
      // Limpa a URL sem recarregar (opcional)
      const cleanUrl = window.location.pathname || "/";
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  if (!show) return null;

  return (
    <div className={ac.shopifyBanner}>
      <span>
        App Shopify instalado com sucesso. Pegue o token em dev.shopify.com → Favela Store Checkout → Settings → API credentials.
      </span>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="ml-2 underline focus:outline-none"
        aria-label="Fechar"
      >
        Fechar
      </button>
    </div>
  );
}
