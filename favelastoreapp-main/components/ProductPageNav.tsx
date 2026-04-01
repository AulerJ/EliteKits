"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STORAGE_IDS = "favelastore_busca_ids";
const STORAGE_NAV_IDS = "favelastore_product_nav_ids";
const STORAGE_Q = "favelastore_busca_q";

export function ProductPageNav({
  productId,
  categoryName,
  categoryHref,
}: {
  productId: string;
  categoryName?: string | null;
  categoryHref?: string | null;
}) {
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const navRaw = sessionStorage.getItem(STORAGE_NAV_IDS);
      const searchRaw = sessionStorage.getItem(STORAGE_IDS);
      const q = sessionStorage.getItem(STORAGE_Q);
      const navIds: string[] = navRaw ? JSON.parse(navRaw) : [];
      const searchIds: string[] = searchRaw ? JSON.parse(searchRaw) : [];
      const ids = navIds.length > 0 && navIds.includes(productId) ? navIds : searchIds;
      const i = ids.indexOf(productId);
      if (i >= 0 && ids.length >= 2) {
        setPrevId(i > 0 ? ids[i - 1] : null);
        setNextId(i < ids.length - 1 ? ids[i + 1] : null);
      }
      setSearchQ(ids === searchIds ? q : null);
    } catch {
      setPrevId(null);
      setNextId(null);
    }
  }, [productId]);

  const hasMiddleLink = searchQ || (categoryHref && categoryName);
  if (!prevId && !nextId && !hasMiddleLink) return null;

  const middleHref = searchQ
    ? `/busca?q=${encodeURIComponent(searchQ)}`
    : categoryHref || "#";
  const middleLabel = "Ver todos os resultados";

  return (
    <nav className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      {prevId ? (
        <Link
          href={`/produto/${prevId}`}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <ChevronLeft className="h-5 w-5" />
          Anterior
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-400">
          <ChevronLeft className="h-5 w-5" />
          Anterior
        </span>
      )}
      {hasMiddleLink && (
        <Link
          href={middleHref}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
        >
          {middleLabel}
        </Link>
      )}
      {nextId ? (
        <Link
          href={`/produto/${nextId}`}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          Próximo
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-400">
          Próximo
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
