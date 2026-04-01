/**
 * TikTok Shop API client (sync produtos do site para a loja TikTok).
 * Documentação: https://partner.tiktokshop.com
 * Configure no .env.local: TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET, TIKTOK_SHOP_ACCESS_TOKEN, TIKTOK_SHOP_REGION
 */

const REGION_BASE: Record<string, string> = {
  us: "https://open-api.us.tiktokshop.com",
  global: "https://open-api.tiktokglobalshop.com",
};

export type TikTokShopConfig = {
  appKey: string;
  appSecret: string;
  accessToken: string;
  region: "us" | "global";
};

export function getTikTokShopConfig(): TikTokShopConfig | null {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim();
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET?.trim();
  const accessToken = process.env.TIKTOK_SHOP_ACCESS_TOKEN?.trim();
  const region = (process.env.TIKTOK_SHOP_REGION?.trim() || "global").toLowerCase() as "us" | "global";
  if (!appKey || !appSecret || !accessToken) return null;
  if (region !== "us" && region !== "global") return null;
  return { appKey, appSecret, accessToken, region };
}

function getBaseUrl(region: string): string {
  return REGION_BASE[region] || REGION_BASE.global;
}

/**
 * Faz uma requisição à API do TikTok Shop.
 * Algumas regiões exigem assinatura (sign) – veja documentação em partner.tiktokshop.com.
 */
export async function tiktokShopRequest<T = unknown>(
  config: TikTokShopConfig,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: object
): Promise<{ data?: T; message?: string; code?: number }> {
  const base = getBaseUrl(config.region);
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tts-access-token": config.accessToken,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      message: (json as { message?: string }).message || res.statusText || "TikTok Shop API error",
      code: (json as { code?: number }).code || res.status,
    };
  }
  return json as { data?: T; message?: string; code?: number };
}

/**
 * Payload mínimo para criar/atualizar produto.
 * Ajuste conforme a documentação da sua região (Create Product / Edit Product).
 */
export type TikTokProductPayload = {
  title: string;
  description?: string;
  price?: { amount: string; currency: string };
  stock?: number;
  images?: { url: string }[];
  sku_id?: string;
  category_id?: string;
};

/**
 * Cria um produto na TikTok Shop.
 * Endpoint exato pode variar por região – veja Partner Center > Create Product.
 */
export async function createTikTokProduct(
  config: TikTokShopConfig,
  payload: TikTokProductPayload
): Promise<{ productId?: string; error?: string }> {
  // Global API exemplo: /product/202309/products (confirmar no Partner Center)
  const path = config.region === "us" ? "/product/202309/products" : "/product/202309/products";
  const body = {
    title: payload.title,
    description: payload.description || payload.title,
    price: payload.price || { amount: "0.00", currency: "USD" },
    stock: payload.stock ?? 1,
    images: payload.images?.length ? payload.images : [{ url: "" }],
    sku_id: payload.sku_id,
    category_id: payload.category_id,
  };

  const res = await tiktokShopRequest<{ product_id?: string; id?: string }>(config, "POST", path, body);
  if (res.message || !res.data) {
    return { error: res.message || "Falha ao criar produto" };
  }
  const productId = (res.data as { product_id?: string; id?: string }).product_id ?? (res.data as { product_id?: string; id?: string }).id;
  return { productId: productId || undefined };
}

/**
 * Atualiza um produto existente na TikTok Shop.
 */
export async function updateTikTokProduct(
  config: TikTokShopConfig,
  tiktokProductId: string,
  payload: Partial<TikTokProductPayload>
): Promise<{ error?: string }> {
  const path = config.region === "us"
    ? `/product/202309/products/${tiktokProductId}`
    : `/product/202309/products/${tiktokProductId}`;
  const res = await tiktokShopRequest(config, "PUT", path, payload);
  if (res.message) return { error: res.message };
  return {};
}
