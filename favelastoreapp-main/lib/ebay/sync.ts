import { getEbayAccessToken } from "./auth";
import { getEbayInventoryApiBase, getEbayCredentials } from "./config";
import https from "https";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function httpsRequest(
  url: string,
  method: string,
  token: string,
  body?: string
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Language": "en-US",
      "Accept-Language": "en-US",
    };
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(body, "utf8"));
    } else if (method === "POST" || method === "PUT") {
      headers["Content-Length"] = "0";
    }
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Lista os locais de estoque da conta eBay. */
export async function getEbayLocations(): Promise<
  { ok: true; locations: { merchantLocationKey: string; name?: string }[] } | { ok: false; error: string }
> {
  const token = await getEbayAccessToken();
  if (!token) return { ok: false, error: "eBay não configurado" };
  const base = getEbayInventoryApiBase();
  const res = await httpsRequest(`${base}/location`, "GET", token);
  if (res.status !== 200) return { ok: false, error: `listLocations: ${res.status} ${res.text.slice(0, 200)}` };
  try {
    const data = JSON.parse(res.text) as { locations?: { merchantLocationKey?: string; name?: string }[] };
    const locations = data.locations ?? [];
    return { ok: true, locations: locations.map((l) => ({ merchantLocationKey: l.merchantLocationKey ?? "", name: l.name })) };
  } catch {
    return { ok: false, error: "Resposta inválida da API" };
  }
}

/** Endereço padrão do local de estoque (não aparece no anúncio; exigido pelo eBay para Item.Country). */
const DEFAULT_LOCATION_ADDRESS = {
  addressLine1: "582 Gurdon St",
  city: "Bridgeport",
  stateOrProvince: "CT",
  postalCode: "06606",
  country: "US",
};

/** Garante que o inventory location existe; cria com endereço completo se não existir (evita erro 25002 / Item.Country). */
async function ensureInventoryLocation(
  base: string,
  token: string,
  merchantLocationKey: string
): Promise<{ ok: boolean; usedKey?: string; error?: string }> {
  const getRes = await httpsRequest(
    `${base}/location/${encodeURIComponent(merchantLocationKey)}`,
    "GET",
    token
  );
  if (getRes.status === 200) return { ok: true, usedKey: merchantLocationKey };
  if (getRes.status !== 404) {
    return { ok: false, error: `getLocation: ${getRes.status} ${getRes.text.slice(0, 150)}` };
  }

  const country = process.env.EBAY_LOCATION_COUNTRY || DEFAULT_LOCATION_ADDRESS.country;
  const postalCode = process.env.EBAY_LOCATION_POSTAL_CODE || DEFAULT_LOCATION_ADDRESS.postalCode;
  const stateOrProvince = process.env.EBAY_LOCATION_STATE || DEFAULT_LOCATION_ADDRESS.stateOrProvince;
  const city = process.env.EBAY_LOCATION_CITY || DEFAULT_LOCATION_ADDRESS.city;
  const addressLine1 = process.env.EBAY_LOCATION_ADDRESS_LINE1 || DEFAULT_LOCATION_ADDRESS.addressLine1;
  const name = process.env.EBAY_LOCATION_NAME || "Default Location";
  const createBody = {
    location: {
      address: { country, postalCode, city, stateOrProvince, addressLine1 },
    },
    name,
  };
  const createRes = await httpsRequest(
    `${base}/location/${encodeURIComponent(merchantLocationKey)}`,
    "POST",
    token,
    JSON.stringify(createBody)
  );
  if (createRes.status === 200 || createRes.status === 204) return { ok: true, usedKey: merchantLocationKey };
  if (createRes.status === 400) {
    const fallbackKey = "favela_store";
    const fallbackRes = await httpsRequest(
      `${base}/location/${encodeURIComponent(fallbackKey)}`,
      "POST",
      token,
      JSON.stringify(createBody)
    );
    if (fallbackRes.status === 200 || fallbackRes.status === 204) return { ok: true, usedKey: fallbackKey };
  }
  return { ok: false, error: `createLocation: ${createRes.status} ${createRes.text.slice(0, 300)}` };
}

/** Atualiza o endereço do local para incluir país (Item.Country); warehouse pode ser atualizado a qualquer momento. */
async function updateLocationAddress(
  base: string,
  token: string,
  merchantLocationKey: string
): Promise<{ ok: boolean }> {
  const country = process.env.EBAY_LOCATION_COUNTRY || DEFAULT_LOCATION_ADDRESS.country;
  const postalCode = process.env.EBAY_LOCATION_POSTAL_CODE || DEFAULT_LOCATION_ADDRESS.postalCode;
  const stateOrProvince = process.env.EBAY_LOCATION_STATE || DEFAULT_LOCATION_ADDRESS.stateOrProvince;
  const city = process.env.EBAY_LOCATION_CITY || DEFAULT_LOCATION_ADDRESS.city;
  const addressLine1 = process.env.EBAY_LOCATION_ADDRESS_LINE1 || DEFAULT_LOCATION_ADDRESS.addressLine1;
  const body = {
    location: {
      address: { country, postalCode, city, stateOrProvince, addressLine1 },
    },
  };
  const res = await httpsRequest(
    `${base}/location/${encodeURIComponent(merchantLocationKey)}/update_location_details`,
    "POST",
    token,
    JSON.stringify(body)
  );
  return { ok: res.status === 200 || res.status === 204 };
}

type ProductRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  size?: string | null;
  product_images?: { url?: string | null; storage_path?: string }[] | null;
};

function firstImageUrl(images: ProductRow["product_images"]): string | null {
  const first = images?.[0];
  if (!first) return null;
  if (first.url) return first.url;
  if (first.storage_path)
    return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${first.storage_path}`;
  return null;
}

export type SyncResult = { sku: string; ok: boolean; listingId?: string; error?: string; skipped?: boolean };

export type SyncOptions = {
  priceIncreaseAmount?: number;
  priceOverrides?: Record<string, number>;
};

export async function syncProductsToEbay(
  products: ProductRow[],
  options?: SyncOptions
): Promise<{ ok: boolean; results: SyncResult[]; message?: string }> {
  const token = await getEbayAccessToken();
  if (!token) {
    return { ok: false, results: [], message: "eBay não configurado. Veja docs/EBAY_SYNC.md e .env" };
  }

  const creds = getEbayCredentials();
  if (!creds || !creds.paymentPolicyId || !creds.returnPolicyId || !creds.fulfillmentPolicyId) {
    return {
      ok: false,
      results: [],
      message: "Defina EBAY_PAYMENT_POLICY_ID, EBAY_RETURN_POLICY_ID e EBAY_FULFILLMENT_POLICY_ID no .env",
    };
  }

  const base = getEbayInventoryApiBase();
  const results: SyncResult[] = [];
  const addDollars = options?.priceIncreaseAmount ?? 0;
  const overrides = options?.priceOverrides ?? {};

  const locationOk = await ensureInventoryLocation(base, token, creds.merchantLocationKey);
  if (!locationOk.ok) {
    return {
      ok: false,
      results: [],
      message: `Local de estoque eBay: ${locationOk.error} Defina EBAY_MERCHANT_LOCATION_KEY no .env ou crie um local no Seller Hub do eBay.`,
    };
  }
  const locationKey = locationOk.usedKey ?? creds.merchantLocationKey;

  const updated = await updateLocationAddress(base, token, locationKey);
  if (!updated.ok) {
    return {
      ok: false,
      results: [],
      message: `O local de estoque "${locationKey}" não pôde ser atualizado com o endereço (país). No Seller Hub do eBay: Account → Inventory locations → abra "${locationKey}" → preencha o endereço completo com Country = United States (US) e salve. Depois tente sincronizar de novo.`,
    };
  }

  for (const p of products) {
    const sku = p.id;
    const imageUrl = firstImageUrl(p.product_images);
    if (!imageUrl) {
      results.push({ sku, ok: false, error: "Produto sem imagem (eBay exige ao menos 1)", skipped: true });
      continue;
    }

    const title = (p.name?.trim() || `Produto ${sku}`).slice(0, 80);
    const description = (p.description?.trim() || title || "Sem descrição").slice(0, 4000);
    let price = typeof p.price === "number" && p.price >= 0 ? p.price : 0;
    if (overrides[sku] != null) price = overrides[sku];
    else if (addDollars !== 0) price = Math.round((price + addDollars) * 100) / 100;
    if (price < 0.99) price = 0.99;

    try {
      const inventoryPayload = {
        availability: {
          shipToLocationAvailability: { quantity: 1 },
        },
        condition: "NEW",
        product: {
          title,
          description,
          imageUrls: [imageUrl],
          aspects: { Size: [p.size?.trim() && p.size.length <= 100 ? p.size : "One Size"] },
        },
      };

      const putInv = await httpsRequest(
        `${base}/inventory_item/${sku}`,
        "PUT",
        token,
        JSON.stringify(inventoryPayload)
      );

      if (putInv.status !== 200 && putInv.status !== 204) {
        results.push({ sku, ok: false, error: `inventory: ${putInv.status} ${putInv.text.slice(0, 200)}` });
        continue;
      }

      let offerId: string | null = null;
      const getOffersUrl = `${base}/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${creds.marketplaceId}`;
      const getOffers = await httpsRequest(getOffersUrl, "GET", token);

      let offerJustCreated = false;
      if (getOffers.status === 200) {
        try {
          const offersData = JSON.parse(getOffers.text) as { offers?: { offerId?: string }[] };
          offerId = offersData.offers?.[0]?.offerId ?? null;
        } catch {
          // ignore parse error
        }
      }

      if (!offerId) {
        const createOfferPayload = {
          sku,
          marketplaceId: creds.marketplaceId,
          format: "FIXED_PRICE",
          listingDuration: "GTC",
          listingDescription: description,
          listingPolicies: {
            paymentPolicyId: creds.paymentPolicyId,
            returnPolicyId: creds.returnPolicyId,
            fulfillmentPolicyId: creds.fulfillmentPolicyId,
          },
          categoryId: creds.categoryId,
          merchantLocationKey: locationKey,
          pricingSummary: { price: { value: String(price), currency: "USD" } },
          quantityLimitPerBuyer: 1,
          availableQuantity: 1,
        };

        const createRes = await httpsRequest(
          `${base}/offer`,
          "POST",
          token,
          JSON.stringify(createOfferPayload)
        );

        if (createRes.status !== 200 && createRes.status !== 201) {
          results.push({ sku, ok: false, error: `createOffer: ${createRes.status} ${createRes.text.slice(0, 200)}` });
          continue;
        }

        try {
          const createData = JSON.parse(createRes.text) as { offerId?: string };
          offerId = createData.offerId ?? null;
          offerJustCreated = true;
        } catch {
          // ignore
        }
      }

      if (!offerId) {
        results.push({ sku, ok: false, error: "offerId não retornado" });
        continue;
      }

      if (!offerJustCreated) {
        const deleteRes = await httpsRequest(`${base}/offer/${offerId}`, "DELETE", token);
        if (deleteRes.status === 200 || deleteRes.status === 204) {
          const createOfferPayload = {
            sku,
            marketplaceId: creds.marketplaceId,
            format: "FIXED_PRICE",
            listingDuration: "GTC",
            listingDescription: description,
            listingPolicies: {
              paymentPolicyId: creds.paymentPolicyId,
              returnPolicyId: creds.returnPolicyId,
              fulfillmentPolicyId: creds.fulfillmentPolicyId,
            },
            categoryId: creds.categoryId,
            merchantLocationKey: locationKey,
            pricingSummary: { price: { value: String(price), currency: "USD" } },
            quantityLimitPerBuyer: 1,
            availableQuantity: 1,
          };
          const createRes = await httpsRequest(`${base}/offer`, "POST", token, JSON.stringify(createOfferPayload));
          if (createRes.status === 200 || createRes.status === 201) {
            try {
              const createData = JSON.parse(createRes.text) as { offerId?: string };
              offerId = createData.offerId ?? null;
            } catch {
              offerId = null;
            }
          } else {
            offerId = null;
          }
        }
      }

      if (!offerId) {
        results.push({ sku, ok: false, error: "offerId não disponível após delete/create" });
        continue;
      }

      const publishRes = await httpsRequest(`${base}/offer/${offerId}/publish`, "POST", token);

      if (publishRes.status !== 200 && publishRes.status !== 201) {
        if (publishRes.status === 400 && publishRes.text.includes("already published")) {
          results.push({ sku, ok: true, listingId: "already listed" });
        } else {
          results.push({ sku, ok: false, error: `publish: ${publishRes.status} ${publishRes.text.slice(0, 500)}` });
        }
        continue;
      }

      try {
        const publishData = JSON.parse(publishRes.text) as { listingId?: string };
        results.push({ sku, ok: true, listingId: publishData.listingId });
      } catch {
        results.push({ sku, ok: true });
      }
    } catch (e) {
      results.push({
        sku,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ok = results.every((r) => r.ok);
  const allItemCountry =
    results.length > 0 &&
    results.every(
      (r) => !r.ok && r.error && (r.error.includes("25002") || r.error.includes("Item.Country"))
    );
  const allSystemError =
    results.length > 0 &&
    results.every(
      (r) =>
        !r.ok &&
        r.error &&
        (r.error.includes("500") || r.error.includes("System error") || r.error.includes("try again later"))
    );
  const message = allSystemError
    ? "Erro 500 do eBay (System error). Veja docs/EBAY_TROUBLESHOOTING.md: use EBAY_ENV=production, confira se a política de envio tem ao menos 1 serviço de envio, política de devolução configurada, local com endereço completo e EBAY_CATEGORY_ID válido."
    : allItemCountry
      ? "Erro Item.Country (25002) no sandbox do eBay. O endereço do local foi enviado, mas o sandbox pode ignorá-lo. Tente com EBAY_ENV=production (conta de vendedor real) ou abra um caso no eBay Developer Support: https://developer.ebay.com/support"
      : undefined;
  return { ok, results, message };
}
