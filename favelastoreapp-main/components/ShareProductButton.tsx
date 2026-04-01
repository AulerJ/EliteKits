"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareProductButtonProps {
  /** URL to copy (e.g. full product link). If not set, uses window.location.href on click. */
  url?: string;
  className?: string;
}

export function ShareProductButton({ url, className }: ShareProductButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const link = url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: open share or do nothing
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
      }
      aria-label={copied ? "Link copiado" : "Copiar link do produto"}
    >
      <Share2 className="h-5 w-5" />
      <span>{copied ? "Link copiado!" : "Compartilhar"}</span>
    </button>
  );
}
