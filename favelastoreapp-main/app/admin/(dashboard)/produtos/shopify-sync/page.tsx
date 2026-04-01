"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type SyncResult = {
  synced: number;
  created: number;
  updated: number;
  total: number;
  errors?: { productId: string; name: string; error: string }[];
};

export default function ShopifySyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/shopify-sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || res.statusText || "Erro ao sincronizar");
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar aos produtos
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">Sincronizar com Shopify</h1>

      <p className="text-zinc-600">
        Envia todos os produtos ativos do seu site para a sua loja Shopify e preenche o link de compra.
        Na página do produto o cliente vê o botão &quot;Comprar no Shopify&quot; e é redirecionado para o checkout na Shopify.
        Configure <strong>SHOPIFY_STORE</strong> e <strong>SHOPIFY_ACCESS_TOKEN</strong> no .env.local.
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#96bf48] px-5 py-2.5 font-semibold text-white transition hover:bg-[#7da53e] disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              Sincronizar com Shopify
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Sincronização concluída</span>
          </div>
          <p className="text-zinc-600">
            {result.created} criados, {result.updated} atualizados ({result.synced} de {result.total} produtos).
          </p>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-sm font-medium text-amber-800">Erros ({result.errors.length}):</p>
              <ul className="list-inside list-disc text-sm text-amber-800">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    {e.name}: {e.error}
                  </li>
                ))}
                {result.errors.length > 10 && (
                  <li>… e mais {result.errors.length - 10}.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
