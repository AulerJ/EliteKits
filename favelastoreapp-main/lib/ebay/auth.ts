import { getEbayAuthUrl, getEbayCredentials } from "./config";

export async function getEbayAccessToken(): Promise<string | null> {
  const result = await getEbayAccessTokenWithError();
  return result.token;
}

/** Retorna o token ou o erro do eBay (para diagnóstico). */
export async function getEbayAccessTokenWithError(): Promise<{ token: string | null; error?: string }> {
  const creds = getEbayCredentials();
  if (!creds) return { token: null, error: "Credenciais não definidas" };

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const res = await fetch(getEbayAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("eBay OAuth error:", res.status, text);
    try {
      const err = JSON.parse(text) as { error_description?: string; error?: string };
      return { token: null, error: err.error_description || err.error || text.slice(0, 200) };
    } catch {
      return { token: null, error: `${res.status}: ${text.slice(0, 200)}` };
    }
  }

  try {
    const data = JSON.parse(text) as { access_token?: string };
    return { token: data.access_token ?? null };
  } catch {
    return { token: null, error: "Resposta inválida do eBay" };
  }
}
