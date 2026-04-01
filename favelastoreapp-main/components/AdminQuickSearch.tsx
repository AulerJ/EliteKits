"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function AdminQuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      router.push(`/busca?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produto..."
          minLength={2}
          className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-20 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
        >
          Buscar
        </button>
      </form>
      <p className="mt-1.5 text-xs text-zinc-500">
        Pressione Enter ou clique em Buscar para ver todos os resultados na página.
      </p>
    </section>
  );
}
