import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEbayAccessTokenWithError } from "@/lib/ebay/auth";
import { getEbayLocations } from "@/lib/ebay/sync";
import { getEbayCredentials, hasEbayConfig, getEbayAccountApiBase } from "@/lib/ebay/config";

async function ebayFetch(url: string, token: string, method = "GET") {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Accept-Language": "en-US" },
  });
  return { status: res.status, text: await res.text() };
}

/** Verifica a configuração do eBay antes de sincronizar (teste completo em ~30s). */
export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  const checks: { name: string; ok: boolean; message: string }[] = [];
  let allOk = true;

  // 1. Credenciais básicas
  if (!hasEbayConfig()) {
    checks.push({ name: "Credenciais", ok: false, message: "EBAY_CLIENT_ID, EBAY_CLIENT_SECRET ou EBAY_REFRESH_TOKEN faltando no .env" });
    return NextResponse.json({ ok: false, checks });
  }
  checks.push({ name: "Credenciais", ok: true, message: "Client ID, Secret e Refresh Token definidos" });

  // 2. Políticas
  const creds = getEbayCredentials();
  if (!creds?.paymentPolicyId) {
    checks.push({ name: "Política de pagamento", ok: false, message: "EBAY_PAYMENT_POLICY_ID não definido" });
    allOk = false;
  } else {
    checks.push({ name: "Política de pagamento", ok: true, message: `ID: ${creds.paymentPolicyId}` });
  }
  if (!creds?.returnPolicyId) {
    checks.push({ name: "Política de devolução", ok: false, message: "EBAY_RETURN_POLICY_ID não definido" });
    allOk = false;
  } else {
    checks.push({ name: "Política de devolução", ok: true, message: `ID: ${creds.returnPolicyId}` });
  }
  if (!creds?.fulfillmentPolicyId) {
    checks.push({ name: "Política de envio", ok: false, message: "EBAY_FULFILLMENT_POLICY_ID não definido" });
    allOk = false;
  } else {
    checks.push({ name: "Política de envio", ok: true, message: `ID: ${creds.fulfillmentPolicyId}. Confira no Seller Hub se tem ao menos 1 serviço de envio.` });
  }

  // 3. Token
  const tokenResult = await getEbayAccessTokenWithError();
  const token = tokenResult.token;
  if (!token) {
    const errMsg = tokenResult.error || "Verifique EBAY_REFRESH_TOKEN e credenciais.";
    checks.push({ name: "Token de acesso", ok: false, message: `Não foi possível obter o token. eBay: ${errMsg}` });
    allOk = false;
  } else {
    checks.push({ name: "Token de acesso", ok: true, message: "Token obtido com sucesso" });
  }

  // 4. Locais de estoque (GET /sell/inventory/v1/location) – se vazio = erro comum 25002
  if (token) {
    const locResult = await getEbayLocations();
    if (!locResult.ok) {
      checks.push({ name: "Inventory Location", ok: false, message: `API falhou: ${locResult.error}` });
      allOk = false;
    } else if (locResult.locations.length === 0) {
      checks.push({
        name: "Inventory Location",
        ok: false,
        message: "Retornou vazio! Crie um local: POST /location/default com address (country, city, state, postalCode). Ou use Seller Hub → Inventory locations.",
      });
      allOk = false;
    } else {
      const keys = locResult.locations.map((l) => l.merchantLocationKey).join(", ");
      const used = creds?.merchantLocationKey || "default";
      const hasKey = locResult.locations.some((l) => l.merchantLocationKey === used);
      checks.push({
        name: "Inventory Location",
        ok: hasKey,
        message: hasKey ? `Locais: ${keys}. Usando: ${used}` : `EBAY_MERCHANT_LOCATION_KEY=${used} não existe. Disponíveis: ${keys}`,
      });
      if (!hasKey) allOk = false;
    }
  }

  // 5. Verificar se a política de envio existe e tem shippingOptions ( causa comum de 500/25002 )
  if (token && creds?.fulfillmentPolicyId) {
    const accountBase = getEbayAccountApiBase();
    const policyRes = await ebayFetch(
      `${accountBase}/fulfillment_policy/${encodeURIComponent(creds.fulfillmentPolicyId)}`,
      token
    );
    const isSandbox = process.env.EBAY_ENV !== "production";
    if (policyRes.status !== 200) {
      if (policyRes.status === 400 && isSandbox) {
        checks.push({
          name: "Política de envio (API)",
          ok: true,
          message: "Sandbox retorna 400 nesta API. No Seller Hub confira se a política tem ao menos 1 serviço de envio. Use EBAY_ENV=production para validar.",
        });
      } else {
        checks.push({
          name: "Política de envio (API)",
          ok: false,
          message: `Policy ID inválido ou inacessível: ${policyRes.status}. Confira EBAY_FULFILLMENT_POLICY_ID no Seller Hub.`,
        });
        allOk = false;
      }
    } else {
      try {
        const policy = JSON.parse(policyRes.text) as { shippingOptions?: unknown[] };
        const hasShipping = !!(policy.shippingOptions && policy.shippingOptions.length > 0);
        checks.push({
          name: "Política de envio (API)",
          ok: hasShipping,
          message: hasShipping
            ? `Política OK, ${policy.shippingOptions!.length} serviço(s) de envio`
            : "Política existe mas não tem shippingOptions! Adicione ao menos 1 serviço de envio no Seller Hub.",
        });
        if (!hasShipping) allOk = false;
      } catch {
        checks.push({ name: "Política de envio (API)", ok: true, message: "Política encontrada (não foi possível verificar shippingOptions)" });
      }
    }
  }

  // 6. Marketplace ID
  checks.push({
    name: "Marketplace ID",
    ok: true,
    message: `Usando: ${creds?.marketplaceId || "EBAY_US"}`,
  });

  // 7. Ambiente
  const env = process.env.EBAY_ENV === "production" ? "production" : "sandbox";
  checks.push({
    name: "Ambiente",
    ok: true,
    message: env === "production" ? "Produção" : "Sandbox (se tiver erro 500, tente EBAY_ENV=production)",
  });

  return NextResponse.json({ ok: allOk, checks });
}
