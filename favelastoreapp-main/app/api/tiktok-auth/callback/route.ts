import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL_BY_REGION: Record<string, string> = {
  us: "https://open-api.us.tiktokshop.com/oauth/token",
  global: "https://open-api.tiktokglobalshop.com/oauth/token",
};

/**
 * GET /api/tiktok-auth/callback
 * TikTok redireciona o vendedor aqui com ?code=xxx após autorizar a app.
 * Trocamos o code por access_token e refresh_token e exibimos na tela para colar no .env.local.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  const errorParam = searchParams.get("error");

  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim();
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET?.trim();
  const region = (process.env.TIKTOK_SHOP_REGION?.trim() || "us").toLowerCase();
  const tokenUrl = TOKEN_URL_BY_REGION[region] || TOKEN_URL_BY_REGION.us;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://catalogo.favelastore.com";
  const redirectUri = `${baseUrl}/api/tiktok-auth/callback`;

  if (errorParam) {
    return htmlResponse(
      "Erro na autorização",
      `TikTok retornou: ${errorParam}. Tente autorizar a app de novo no Seller Center.`
    );
  }

  if (!code) {
    return htmlResponse(
      "Código não recebido",
      "TikTok não enviou o parâmetro code. Certifique-se de que a Redirect URL da app é exatamente: " + redirectUri
    );
  }

  if (!appKey || !appSecret) {
    return htmlResponse(
      "Configuração faltando",
      "Defina TIKTOK_SHOP_APP_KEY e TIKTOK_SHOP_APP_SECRET no .env.local e reinicie o servidor."
    );
  }

  const body = new URLSearchParams({
    app_key: appKey,
    app_secret: appSecret,
    auth_code: code,
    grant_type: "authorized_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok) {
    const msg = data.message || data.code || res.statusText || "Resposta inválida do TikTok";
    return htmlResponse(
      "Erro ao obter token",
      `TikTok respondeu: ${msg}. Verifique se a Redirect URL na app é exatamente: ${redirectUri}`
    );
  }

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  if (!accessToken) {
    return htmlResponse(
      "Token não retornado",
      "TikTok não devolveu access_token. Resposta: " + JSON.stringify(data).slice(0, 500)
    );
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TikTok Shop – Token</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #0d9488; }
    .box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 1.25rem; margin: 1rem 0; }
    pre { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 13px; }
    .warn { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    a { color: #0d9488; }
  </style>
</head>
<body>
  <h1>TikTok Shop – Token obtido</h1>
  <p>Adicione estas linhas no seu <strong>.env.local</strong> (e nas variáveis de ambiente do deploy):</p>
  <div class="box">
    <pre>TIKTOK_SHOP_APP_KEY=${escapeHtml(appKey)}
TIKTOK_SHOP_APP_SECRET=*** (já está no .env.local)
TIKTOK_SHOP_ACCESS_TOKEN=${escapeHtml(accessToken)}
TIKTOK_SHOP_REGION=${escapeHtml(region)}</pre>
  </div>
  ${refreshToken ? `<p><strong>Refresh token</strong> (guarde para renovar o access token quando expirar):</p><div class="box"><pre>TIKTOK_SHOP_REFRESH_TOKEN=${escapeHtml(refreshToken)}</pre></div>` : ""}
  <p class="box warn">O <code>access_token</code> expira em algumas horas. Quando expirar, use o <code>refresh_token</code> ou repita a autorização nesta página.</p>
  <p><a href="${escapeHtml(baseUrl)}/admin">Ir para o Admin</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlResponse(title: string, message: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TikTok Shop – ${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #b91c1c; }
    .box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 1.25rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="box">${escapeHtml(message)}</div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
