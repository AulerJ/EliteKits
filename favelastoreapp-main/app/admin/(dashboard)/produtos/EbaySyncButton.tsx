"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function EbaySyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/ebay-sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Erro ao sincronizar");
        return;
      }
      const okCount = data.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0;
      const total = data.results?.length ?? 0;
      if (data.message) setError(data.message);
      else setMessage(total === 0 ? "Nenhum produto ativo." : `${okCount}/${total} produtos sincronizados com o eBay.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Sincronizar com eBay
      </button>
      {message && <span className="text-sm text-green-700">{message}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
