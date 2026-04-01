"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCatalogSearch } from "./CatalogSearchContext";

function slugifySize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function buildQueryOnlyBuscaOrdenar(params: URLSearchParams, busca: string): string {
  const sp = new URLSearchParams();
  const ordenar = params.get("ordenar");
  if (ordenar) sp.set("ordenar", ordenar);
  if (busca?.trim()) sp.set("busca", busca.trim());
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function buildQueryWithTamanho(
  params: URLSearchParams,
  tamanho: string,
  busca: string
): string {
  const sp = new URLSearchParams(params.toString());
  if (tamanho) sp.set("tamanho", tamanho);
  else sp.delete("tamanho");
  if (busca?.trim()) sp.set("busca", busca.trim());
  else sp.delete("busca");
  const q = sp.toString();
  return q ? `?${q}` : "";
}

interface CategorySizeLinksProps {
  basePath: string;
  parentPath: string | null;
  sizes: string[];
  currentTamanho: string | null;
}

export function CategorySizeLinks({
  basePath,
  parentPath,
  sizes,
  currentTamanho,
}: CategorySizeLinksProps) {
  const searchParams = useSearchParams();
  const { searchQuery } = useCatalogSearch();

  const usePathForSize = parentPath !== null;

  const sizeButtonClass = (s: string) => {
    const low = s.toLowerCase();
    const selected = currentTamanho?.toLowerCase() === low;
    if (low === "feminina") {
      return selected
        ? "bg-pink-600 text-white shadow-md ring-2 ring-pink-500/30"
        : "bg-pink-100 text-pink-800 shadow-sm ring-1 ring-pink-200/60 hover:bg-pink-200 hover:ring-pink-300";
    }
    if (low === "infantil") {
      return selected
        ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-500/30"
        : "bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200/60 hover:bg-sky-200 hover:ring-sky-300";
    }
    return selected
      ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/30"
      : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200";
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50 to-white px-3 py-2.5 shadow-sm">
      <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Trocar tamanho</span>
      <div className="flex flex-wrap gap-1.5">
        {sizes.map((s) => {
          const href = usePathForSize
            ? `${parentPath}/${slugifySize(s)}${buildQueryOnlyBuscaOrdenar(searchParams, searchQuery)}`
            : `${basePath}${buildQueryWithTamanho(searchParams, s, searchQuery)}`;
          return (
            <Link
              key={s}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${sizeButtonClass(s)}`}
            >
              {s}
            </Link>
          );
        })}
        <Link
          href={
            usePathForSize
              ? `${parentPath}${buildQueryOnlyBuscaOrdenar(searchParams, searchQuery)}`
              : `${basePath}${buildQueryWithTamanho(searchParams, "", searchQuery)}`
          }
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-500 shadow-sm ring-1 ring-zinc-200/60 hover:bg-zinc-50 hover:ring-zinc-300"
        >
          ↩ Voltar
        </Link>
      </div>
    </div>
  );
}
