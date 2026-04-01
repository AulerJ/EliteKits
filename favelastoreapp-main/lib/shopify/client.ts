/**
 * Shopify Admin REST API - criar/atualizar produtos para checkout na Shopify.
 * Opção 1: SHOPIFY_STORE + SHOPIFY_ACCESS_TOKEN (token fixo)
 * Opção 2: SHOPIFY_STORE + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (token obtido via client credentials, válido 24h)
 */

const SHOPIFY_API_VERSION = "2024-01";

function getStore(): string | null {
  const store = process.env.SHOPIFY_STORE?.trim();
  if (!store) return null;
  return store.replace(/\.myshopify\.com$/i, "");
}

function getConfig(): { baseUrl: string; store: string } | null {
  const store = getStore();
  if (!store) return null;
  return {
    baseUrl: `https://${store}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}`,
    store,
  };
}

/** Token estático (se definido) ou obtido via client credentials. */
let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  const staticToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
  // Só usa token estático se for access token (shpat_...). Se alguém colou Client ID em SHOPIFY_ACCESS_TOKEN, ignora e usa client credentials.
  if (staticToken?.startsWith("shpat_")) return staticToken;

  const store = getStore();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!store || !clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const res = await fetch(
    `https://${store}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (data.access_token) {
    cachedToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;
    return cachedToken;
  }
  return null;
}

/** Mensagem clara quando falta configuração (para exibir ao usuário). */
function getTokenErrorMessage(): string {
  const store = process.env.SHOPIFY_STORE?.trim();
  const hasToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim()?.startsWith("shpat_");
  const hasClientId = !!process.env.SHOPIFY_CLIENT_ID?.trim();
  const hasSecret = !!process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (!store) return "Defina SHOPIFY_STORE no Vercel (ex: 5073f1-e9.myshopify.com).";
  if (hasToken) return "SHOPIFY_ACCESS_TOKEN está definido mas a Shopify rejeitou. Confira se o token é válido e tem permissão draft_orders.";
  if (!hasClientId || !hasSecret) {
    return "No Vercel (Settings → Environment Variables) defina SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET com os valores do app Favela Store Checkout. Depois faça Redeploy.";
  }
  return "A Shopify não retornou um token (app instalado na loja? scope write_draft_orders na versão do app?). Confira os logs no Vercel.";
}

export function getShopifyConfig() {
  return getConfig();
}

export async function createShopifyProduct(
  title: string,
  bodyHtml: string,
  price: string,
  inventoryQuantity: number,
  imageUrls: string[]
): Promise<{ id: number; handle: string; error?: string }> {
  const config = getConfig();
  if (!config) return { id: 0, handle: "", error: "Shopify não configurado (SHOPIFY_STORE)." };
  const token = await getAccessToken();
  if (!token) return { id: 0, handle: "", error: getTokenErrorMessage() };

  const product: Record<string, unknown> = {
    title: title.slice(0, 255),
    body_html: bodyHtml?.slice(0, 5000) || title,
    status: "active",
    variants: [{ price, inventory_quantity: Math.max(0, inventoryQuantity) }],
  };
  if (imageUrls.length > 0) {
    product.images = imageUrls.slice(0, 10).map((src) => ({ src }));
  }

  const res = await fetch(`${config.baseUrl}/products.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ product }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { errors?: unknown }).errors
      ? JSON.stringify((json as { errors: unknown }).errors)
      : (json as { message?: string }).message || res.statusText;
    return { id: 0, handle: "", error: msg };
  }

  const p = (json as { product?: { id: number; handle: string } }).product;
  if (!p) return { id: 0, handle: "", error: "Resposta inválida da Shopify." };
  return { id: p.id, handle: p.handle };
}

export async function updateShopifyProduct(
  shopifyProductId: string,
  title: string,
  bodyHtml: string,
  price: string,
  inventoryQuantity: number,
  imageUrls: string[]
): Promise<{ handle?: string; error?: string }> {
  const config = getConfig();
  if (!config) return { error: "Shopify não configurado." };
  const token = await getAccessToken();
  if (!token) return { error: getTokenErrorMessage() };

  const product: Record<string, unknown> = {
    title: title.slice(0, 255),
    body_html: bodyHtml?.slice(0, 5000) || title,
    variants: [{ price, inventory_quantity: Math.max(0, inventoryQuantity) }],
  };
  if (imageUrls.length > 0) {
    product.images = imageUrls.slice(0, 10).map((src) => ({ src }));
  }

  const res = await fetch(`${config.baseUrl}/products/${shopifyProductId}.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ product }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { errors?: unknown }).errors
      ? JSON.stringify((json as { errors: unknown }).errors)
      : (json as { message?: string }).message || res.statusText;
    return { error: msg };
  }

  const p = (json as { product?: { handle: string } }).product;
  return { handle: p?.handle };
}

export function buildShopifyProductUrl(handle: string): string {
  const store = process.env.SHOPIFY_STORE?.trim() || "";
  const host = store.replace(/\.myshopify\.com$/i, "");
  if (!host) return "";
  return `https://${host}.myshopify.com/products/${handle}`;
}

/** Cria um Draft Order na Shopify (itens customizados, sem precisar de produtos na loja). Cliente paga pelo link. */
export type DraftOrderLineItem = {
  title: string;
  price: string;
  quantity: number;
  /** Ex.: [{ name: "Tamanho", value: "M" }] — aparece no pedido na Shopify */
  properties?: { name: string; value: string }[];
  /** URL da foto no catálogo (Shopify não mostra miniatura em item custom; aparece como propriedade "Link da foto") */
  imageUrl?: string | null;
};
export type DraftOrderAddress = {
  first_name?: string;
  last_name?: string;
  address1?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
};

export async function createDraftOrder(params: {
  lineItems: DraftOrderLineItem[];
  email?: string;
  note?: string;
  shippingAddress?: DraftOrderAddress;
}): Promise<{ invoiceUrl?: string; draftOrderId?: string; error?: string }> {
  const config = getConfig();
  if (!config) return { error: "Shopify não configurado (SHOPIFY_STORE)." };
  const token = await getAccessToken();
  if (!token) return { error: getTokenErrorMessage() };

  const draftOrder: Record<string, unknown> = {
    line_items: params.lineItems.map((item) => {
      const line: Record<string, unknown> = {
        title: item.title.slice(0, 255),
        price: item.price,
        quantity: Math.max(1, item.quantity),
      };
      const props: { name: string; value: string }[] = item.properties?.length
        ? item.properties.map((p) => ({ name: p.name.slice(0, 255), value: String(p.value).slice(0, 255) }))
        : [];
      if (item.imageUrl?.trim()) {
        props.push({
          name: "Link da foto",
          value: item.imageUrl.trim().slice(0, 255),
        });
      }
      if (props.length > 0) line.properties = props;
      return line;
    }),
    note:
      params.note ||
      `Pedido ${process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "EliteKits"} (${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "site"})`,
  };
  if (params.email) draftOrder.email = params.email;
  if (params.shippingAddress && params.shippingAddress.address1) {
    draftOrder.shipping_address = {
      first_name: params.shippingAddress.first_name || "",
      last_name: params.shippingAddress.last_name || "",
      address1: params.shippingAddress.address1,
      city: params.shippingAddress.city || "",
      province: params.shippingAddress.province || "",
      country: params.shippingAddress.country || "United States",
      zip: params.shippingAddress.zip || "",
      phone: params.shippingAddress.phone || "",
    };
  }

  const res = await fetch(`${config.baseUrl}/draft_orders.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ draft_order: draftOrder }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { errors?: unknown }).errors
      ? JSON.stringify((json as { errors: unknown }).errors)
      : (json as { message?: string }).message || res.statusText;
    if (res.status === 401) {
      return {
        error:
          "Shopify rejeitou o token. Use um Custom app: na loja → Settings → Apps → Develop apps → Create an app → ative draft_orders → copie o Admin API access token e defina SHOPIFY_ACCESS_TOKEN no Vercel.",
      };
    }
    return { error: msg };
  }

  const draft = (json as { draft_order?: { id?: number; invoice_url?: string } }).draft_order;
  const invoiceUrl = draft?.invoice_url;
  if (!invoiceUrl) return { error: "Shopify não retornou o link de pagamento." };
  const draftOrderId = draft?.id != null ? String(draft.id) : undefined;
  return { invoiceUrl, draftOrderId };
}
