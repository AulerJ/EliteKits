import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { getTikTokShopConfig } from "@/lib/tiktok-shop/client";
import { TikTokSyncButton } from "./TikTokSyncButton";

export const dynamic = "force-dynamic";

const AUTH_URL_US = "https://auth.tiktok-shops.com/oauth/authorize";
const AUTH_URL_GLOBAL = "https://auth.tiktokglobalshop.com/oauth/authorize";

export default async function TikTokShopAdminPage() {
  const config = getTikTokShopConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://catalogo.favelastore.com";
  const redirectUri = `${siteUrl}/api/tiktok-auth/callback`;
  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim();
  const authUrlUs = appKey
    ? `${AUTH_URL_US}?app_key=${encodeURIComponent(appKey)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=1`
    : null;
  const authUrlGlobal = appKey
    ? `${AUTH_URL_GLOBAL}?app_key=${encodeURIComponent(appKey)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=1`
    : null;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">TikTok Shop</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sincronize os produtos do site com a sua loja no TikTok para vender por lá.
        </p>
      </div>

      {/* Status */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Status da conexão</h2>
        {config ? (
          <div className="mt-3 flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>App Key, Secret e Access Token configurados (região: {config.region})</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-amber-700">
            <XCircle className="h-5 w-5" />
            <span>Faltam variáveis no .env.local. Veja o passo a passo abaixo.</span>
          </div>
        )}
      </section>

      {/* Passo 1: App no Partner Center */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">1. Criar app no TikTok Partner Center</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Acesse{" "}
          <a
            href="https://partner.tiktokshop.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-green-600 hover:underline"
          >
            partner.tiktokshop.com
            <ExternalLink className="h-3.5 w-3.5" />
          </a>{" "}
          (ou o da sua região: US, UK, etc.). Crie uma app, anote <strong>App Key</strong> e <strong>App Secret</strong>.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Em <strong>Callback URL / Redirect URI</strong> use exatamente:
        </p>
        <p className="mt-1 rounded-lg bg-zinc-100 p-3 font-mono text-xs text-zinc-800 break-all">
          {redirectUri}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Ative as permissões de <strong>Product</strong> (Create, Edit, Get) na app.
        </p>
      </section>

      {/* Passo 2: Obter token */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">2. Obter Access Token</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Autorize a app na sua TikTok Shop. Ao terminar, você será redirecionado para esta página e verá o token para colar no .env.local.
        </p>
        {authUrlUs && (
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={authUrlUs}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Conectar TikTok Shop (US)
              <ExternalLink className="h-4 w-4" />
            </a>
            {authUrlGlobal && (
              <a
                href={authUrlGlobal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Conectar TikTok Shop (Global)
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
        {!appKey && (
          <p className="mt-3 text-sm text-amber-700">
            Defina TIKTOK_SHOP_APP_KEY no .env.local e reinicie o servidor para exibir o botão.
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Se a sua região usar outro domínio de autorização, use o link indicado na documentação do Partner Center e cole a Redirect URI acima.
        </p>
      </section>

      {/* Passo 3: .env.local */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">3. Variáveis no .env.local</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
{`TIKTOK_SHOP_APP_KEY=seu_app_key
TIKTOK_SHOP_APP_SECRET=seu_app_secret
TIKTOK_SHOP_ACCESS_TOKEN=token_obtido_no_passo_2
TIKTOK_SHOP_REGION=us
`}
        </pre>
        <p className="mt-2 text-sm text-zinc-600">
          Use <code className="rounded bg-zinc-200 px-1">TIKTOK_SHOP_REGION=us</code> para loja nos EUA ou{" "}
          <code className="rounded bg-zinc-200 px-1">global</code> para outras regiões. O token expira; quando expirar, repita o passo 2 ou use o refresh token (veja TIKTOK_SHOP.md).
        </p>
      </section>

      {/* Sincronizar */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">4. Sincronizar produtos</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Envia os produtos ativos do site para a TikTok Shop (cria novos e atualiza os que já têm tiktok_product_id).
        </p>
        <div className="mt-4">
          <TikTokSyncButton disabled={!config} />
        </div>
      </section>

      <p className="text-center text-sm text-zinc-500">
        Instruções completas no arquivo <code className="rounded bg-zinc-200 px-1">TIKTOK_SHOP.md</code> na raiz do projeto.
      </p>
    </div>
  );
}
