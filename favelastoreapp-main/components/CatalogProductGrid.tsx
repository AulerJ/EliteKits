"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, ShoppingCart } from "lucide-react";
import { useCatalogSearch } from "./CatalogSearchContext";
import { ProductSortSelector } from "./ProductSortSelector";
import { useCart } from "./CartContext";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  size: string | null;
  stock?: number | null;
  imageUrls: string[];
}

interface CatalogProductGridProps {
  products: CatalogProduct[];
  whatsappNumber: string;
  initialSearch?: string;
  /** Se definido, exibe "X produtos" + Ordenar no mesmo quadrado da busca */
  totalCount?: number;
  /** Label opcional (ex.: "no tamanho M") */
  countLabel?: string;
}

function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const row = Array.from({ length: bn + 1 }, (_, i) => i);
  for (let i = 1; i <= an; i++) {
    let prev = i;
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = next;
    }
    row[bn] = prev;
  }
  return row[bn];
}

function typoThreshold(len: number): number {
  if (len <= 3) return 1;
  if (len <= 6) return 2;
  return Math.min(3, Math.floor(len / 3) + 1);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length >= 2);
}

function matchSearch(p: CatalogProduct, q: string): boolean {
  if (!q.trim()) return true;
  const term = q.trim().toLowerCase();
  const name = (p.name ?? "").toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  if (name.includes(term) || desc.includes(term)) return true;
  const threshold = typoThreshold(term.length);
  const nameWords = words(name);
  const descWords = words(desc);
  for (const w of nameWords) {
    if (w.length >= 2 && levenshtein(term, w) <= threshold) return true;
  }
  for (const w of descWords) {
    if (w.length >= 2 && levenshtein(term, w) <= threshold) return true;
  }
  return false;
}

/** Distância máxima para sugerir "Você quis dizer?" (pode ser maior que o threshold do filtro). */
const MAX_SUGGEST_DISTANCE = 4;

function findDidYouMean(products: CatalogProduct[], query: string): string | null {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return null;
  let best: { word: string; dist: number } | null = null;
  for (const p of products) {
    const name = (p.name ?? "").toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    for (const w of [...words(name), ...words(desc)]) {
      if (w.length < 2) continue;
      const d = levenshtein(term, w);
      if (d <= MAX_SUGGEST_DISTANCE && (best === null || d < best.dist)) {
        best = { word: w, dist: d };
      }
    }
  }
  return best?.word ?? null;
}

export function CatalogProductGrid({
  products,
  whatsappNumber,
  initialSearch,
  totalCount,
  countLabel,
}: CatalogProductGridProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useCatalogSearch();
  const { addItem } = useCart();

  useEffect(() => {
    const term = searchQuery.trim();
    const current = searchParams.get("busca") ?? "";
    if (term === current) return;
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) params.set("busca", term);
      else params.delete("busca");
      const q = params.toString();
      const url = q ? `${pathname}?${q}` : pathname;
      router.replace(url, { scroll: false });
    }, 400);
    return () => clearTimeout(id);
  }, [searchQuery, pathname, router, searchParams]);

  const filteredProducts = useMemo(
    () => products.filter((p) => matchSearch(p, searchQuery)),
    [products, searchQuery]
  );

  const didYouMean = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const suggestion = findDidYouMean(products, searchQuery);
    if (!suggestion) return null;
    if (suggestion === searchQuery.trim().toLowerCase()) return null;
    return suggestion;
  }, [products, searchQuery]);

  return (
    <>
      <div className="mt-3 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm">
        {(totalCount !== undefined || countLabel) && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
            <p className="text-sm font-medium text-zinc-600">
              {totalCount !== undefined && (
                <>{totalCount} produto{totalCount !== 1 ? "s" : ""}{countLabel ? ` ${countLabel}` : ""}</>
              )}
              {totalCount === undefined && countLabel && <>{countLabel}</>}
            </p>
            {totalCount !== undefined && totalCount > 0 && <ProductSortSelector />}
          </div>
        )}
        <label htmlFor="catalog-search" className="sr-only">
          Buscar nesta categoria
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="catalog-search"
            type="search"
            placeholder="Buscar por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-600"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1.5 text-xs text-zinc-500">
            {filteredProducts.length === 0 ? (
              <>
                Nenhum resultado para &quot;{searchQuery}&quot;.
                {didYouMean && (
                  <>
                    {" "}
                    Você quis dizer{" "}
                    <button
                      type="button"
                      onClick={() => setSearchQuery(didYouMean)}
                      className="font-semibold text-green-600 underline decoration-green-600/50 underline-offset-2 hover:text-green-700 hover:decoration-green-700"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </>
                )}
              </>
            ) : (
              <>
                {filteredProducts.length} {filteredProducts.length === 1 ? "resultado" : "resultados"}
                {didYouMean && (
                  <>
                    {" — "}
                    Você quis dizer{" "}
                    <button
                      type="button"
                      onClick={() => setSearchQuery(didYouMean)}
                      className="font-semibold text-green-600 underline decoration-green-600/50 underline-offset-2 hover:text-green-700 hover:decoration-green-700"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </>
                )}
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => {
          const firstImg = p.imageUrls[0];
          const handleAddToCart = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            addItem(
              {
                id: p.size ? `${p.id}__${p.size}` : p.id,
                name: p.name ?? null,
                price: p.price ?? null,
                imageUrl: firstImg ?? null,
                size: p.size ?? null,
              },
              1,
              p.stock ?? null
            );
          };

          return (
            <Link
              key={p.id}
              href={`/produto/${p.id}`}
              className="group flex w-full flex-col overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 ring-zinc-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-green-300/50"
            >
              <div className="aspect-square overflow-hidden bg-zinc-50">
                {firstImg ? (
                  <Image
                    src={firstImg}
                    alt={p.name?.trim() || ""}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200/80">
                    <div className="h-16 w-16 rounded-full bg-zinc-300/60" />
                    <span className="text-sm font-medium text-zinc-500">
                      Sem foto
                    </span>
                  </div>
                )}
              </div>
              {(p.name || p.description || p.price != null || p.size) && (
                <div className="flex flex-1 flex-col p-5">
                  {p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i) && (
                    <h3 className="font-bold text-zinc-900 line-clamp-2">{p.name.trim()}</h3>
                  )}
                  {(p.stock ?? 1) > 1 ? (
                    <p className="mt-0.5 text-xs font-medium text-zinc-600">{(p.stock ?? 1)} unidades</p>
                  ) : (
                    // Placeholder invisível para manter altura igual entre cards
                    <p className="mt-0.5 text-xs font-medium text-transparent select-none">.</p>
                  )}
                  {p.size && (
                    <p className="mt-0.5 text-sm font-medium text-zinc-600">Tamanho: {p.size}</p>
                  )}
                  {p.description && (
                    <p className={`line-clamp-2 text-sm text-zinc-600 ${p.name?.trim() || p.size ? "mt-1" : ""}`}>
                      {p.description}
                    </p>
                  )}
                  {p.price != null && (
                    <span className={`mt-auto inline-block text-lg font-bold text-green-600 ${p.name?.trim() || p.description || p.size ? "mt-3" : ""}`}>
                      US$ {Number(p.price).toFixed(2)}
                    </span>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-500"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
