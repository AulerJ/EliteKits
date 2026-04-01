/**
 * Configuração eBay – sincronização de produtos com o site.
 * Veja docs/EBAY_SYNC.md para obter as credenciais.
 */

export function hasEbayConfig(): boolean {
  return !!(
    process.env.EBAY_CLIENT_ID &&
    process.env.EBAY_CLIENT_SECRET &&
    process.env.EBAY_REFRESH_TOKEN
  );
}

export const EBAY_ENV = process.env.EBAY_ENV === "production" ? "production" : "sandbox";
const TOKEN_URL = EBAY_ENV === "production"
  ? "https://api.ebay.com/identity/v1/oauth2/token"
  : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
const INVENTORY_API = EBAY_ENV === "production"
  ? "https://api.ebay.com/sell/inventory/v1"
  : "https://api.sandbox.ebay.com/sell/inventory/v1";
const ACCOUNT_API = EBAY_ENV === "production"
  ? "https://api.ebay.com/sell/account/v1"
  : "https://api.sandbox.ebay.com/sell/account/v1";

export function getEbayAccountApiBase(): string {
  return ACCOUNT_API;
}

export function getEbayAuthUrl(): string {
  return TOKEN_URL;
}

export function getEbayInventoryApiBase(): string {
  return INVENTORY_API;
}

export function getEbayCredentials(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
  marketplaceId: string;
  merchantLocationKey: string;
  categoryId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  fulfillmentPolicyId: string;
} | null {
  if (!hasEbayConfig()) return null;
  return {
    clientId: process.env.EBAY_CLIENT_ID!,
    clientSecret: process.env.EBAY_CLIENT_SECRET!,
    refreshToken: process.env.EBAY_REFRESH_TOKEN!,
    redirectUri: process.env.EBAY_RUNAME || process.env.EBAY_REDIRECT_URI || "",
    marketplaceId: process.env.EBAY_MARKETPLACE_ID || "EBAY_US",
    merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY || "default",
    categoryId: process.env.EBAY_CATEGORY_ID || "11450",
    paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID || "",
    returnPolicyId: process.env.EBAY_RETURN_POLICY_ID || "",
    fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID || "",
  };
}

const CONSENT_URL = EBAY_ENV === "production"
  ? "https://auth.ebay.com/oauth2/authorize"
  : "https://auth.sandbox.ebay.com/oauth2/authorize";

const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

export function getEbayConsentUrl(): string | null {
  const clientId = process.env.EBAY_CLIENT_ID;
  const redirectUri = process.env.EBAY_RUNAME || process.env.EBAY_REDIRECT_URI;
  if (!clientId || !redirectUri) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: EBAY_SCOPES,
  });
  return `${CONSENT_URL}?${params.toString()}`;
}
