"use client";

import { useEffect, useState } from "react";

/**
 * Quando a Shopify redireciona para o site após instalar o app (URL com shop= e hmac=),
 * mostra um aviso breve e opcionalmente limpa a URL.
 */
export function ShopifyInstallBanner() {
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
    <div className="bg-green-700 px-4 py-2 text-center text-sm text-white">
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
