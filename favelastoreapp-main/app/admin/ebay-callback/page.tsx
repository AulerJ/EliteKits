"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, CheckCircle, ExternalLink } from "lucide-react";

export default function EbayCallbackPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const code = params.get("code");

    if (code) {
      setStatus("loading");
      fetch("/api/ebay-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.refresh_token) {
            setRefreshToken(data.refresh_token);
            setStatus("done");
          } else {
            setError(data.error || "Resposta inválida do servidor.");
            setStatus("error");
          }
        })
        .catch((e) => {
          setError(e.message || "Erro de rede.");
          setStatus("error");
        });
    } else {
      fetch("/api/ebay-token")
        .then((r) => r.json())
        .then((data) => {
          if (data.consentUrl) setConsentUrl(data.consentUrl);
          else setError(data.error || "Configure o .env. Veja docs/EBAY_SETUP.md.");
        })
        .catch(() => setError("Erro ao carregar URL de autorização."));
    }
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link
        href="/admin/produtos/ebay-sync"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar ao eBay
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">eBay – Token de acesso</h1>

      {status === "loading" && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <span className="text-amber-800">Trocando o código pelo Refresh Token...</span>
        </div>
      )}

      {status === "done" && refreshToken && (
        <div className="mt-8 space-y-4 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-6 w-6" />
            <span className="font-semibold">Refresh Token gerado</span>
          </div>
          <p className="text-sm text-zinc-700">
            Adicione no seu <strong>.env.local</strong> (e nas variáveis de ambiente da Vercel):
          </p>
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
            EBAY_REFRESH_TOKEN={refreshToken}
          </pre>
          <p className="text-xs text-zinc-500">
            Copie a linha acima, cole no .env.local, salve e reinicie o servidor (ou faça novo deploy).
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-800">Erro</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <Link
            href="/admin/ebay-callback"
            className="mt-4 inline-block text-sm font-medium text-red-600 hover:underline"
          >
            Tentar de novo
          </Link>
        </div>
      )}

      {!refreshToken && status === "idle" && (
        <div className="mt-8 space-y-6">
          {consentUrl ? (
            <>
              <p className="text-zinc-600">
                Clique no botão abaixo para ser redirecionado ao eBay. Faça login, clique em <strong>Autorizar</strong> e você
                voltará para esta página com o Refresh Token.
              </p>
              <a
                href={consentUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir página de autorização do eBay
              </a>
              <p className="text-xs text-amber-800">
                Use a <strong>mesma aba</strong>: não abra em nova janela. Depois de autorizar no eBay, você volta aqui e o token aparece.
              </p>
            </>
          ) : (
            error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                {error}
              </div>
            )
          )}
        </div>
      )}

      <p className="mt-8 text-xs text-zinc-500">
        Guia completo: <strong>docs/EBAY_SETUP.md</strong>
      </p>
    </div>
  );
}
