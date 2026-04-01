"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface TikTokSyncButtonProps {
  disabled?: boolean;
}

export function TikTokSyncButton({ disabled }: TikTokSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    synced?: number;
    created?: number;
    updated?: number;
    total?: number;
    errors?: Array<{ productId: string; name: string; error: string }>;
    error?: string;
  } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tiktok-sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ error: data.error || res.statusText || "Erro ao sincronizar" });
        return;
      }
      setResult({
        synced: data.synced,
        created: data.created,
        updated: data.updated,
        total: data.total,
        errors: data.errors,
      });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Erro de rede" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sincronizando..." : "Sincronizar com TikTok Shop"}
      </button>
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {result.error ? (
            <p className="font-medium">{result.error}</p>
          ) : (
            <>
              <p className="font-medium">
                {result.synced ?? 0} de {result.total ?? 0} produto(s) sincronizado(s) (criados: {result.created ?? 0}, atualizados: {result.updated ?? 0})
              </p>
              {result.errors?.length ? (
                <ul className="mt-2 list-inside list-disc text-sm">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      {e.name || e.productId}: {e.error}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>… e mais {result.errors.length - 5} erro(s)</li>
                  )}
                </ul>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
