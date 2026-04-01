"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { ProdutoCard } from "./ProdutoCard";

/** Type that ProdutoCard expects (price: number | null). */
type ProdutoCardItem = {
  id: string;
  name: string;
  price: number | null;
  size?: string | null;
  is_active: boolean;
  categories: { name: string } | null;
  product_images: { url: string | null; storage_path: string }[] | null;
};

type Produto = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  size?: string | null;
  is_active: boolean;
  categories: { name: string } | null;
  product_images: { url: string | null; storage_path: string }[] | null;
  [key: string]: unknown;
};

export function ProductListWithSearch({
  products,
  folderName,
  addProductHref,
  returnTo,
}: {
  products: Produto[];
  folderName: string;
  addProductHref: string;
  returnTo?: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      const cat = (p.categories?.name ?? "").toLowerCase();
      const size = (p.size ?? "").toLowerCase();
      return (
        name.includes(term) ||
        desc.includes(term) ||
        cat.includes(term) ||
        size.includes(term)
      );
    });
  }, [products, search]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
          <span className="rounded-lg bg-green-100 px-2 py-0.5 text-green-800">
            {folderName}
          </span>
          <span className="text-sm font-normal text-zinc-500">
            ({filtered.length} de {products.length}{" "}
            {products.length === 1 ? "produto" : "produtos"})
          </span>
        </h2>
        {products.length > 0 && (
          <div className="relative ml-auto min-w-[200px] max-w-xs flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nesta pasta (nome, descrição...)"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              aria-label="Buscar produto nesta categoria"
            />
          </div>
        )}
      </div>
      {products.length > 0 ? (
        <>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProdutoCard key={String(p.id)} produto={p as ProdutoCardItem} returnTo={returnTo} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
              <p className="text-zinc-600">
                Nenhum produto encontrado para &quot;{search.trim()}&quot;.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Tente outro termo ou limpe a busca.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-500">Nenhum produto nesta pasta.</p>
          <a href={addProductHref} className="mt-4 inline-block text-green-600 hover:underline">
            Adicionar produto
          </a>
        </div>
      )}
    </section>
  );
}
