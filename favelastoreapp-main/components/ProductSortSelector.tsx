"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ProductSortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentSort = searchParams.get("ordenar") || "padrao";

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "padrao") {
      params.delete("ordenar");
    } else {
      params.set("ordenar", value);
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-zinc-500 sm:text-sm">Ordenar:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:text-sm"
      >
        <option value="padrao">Padrão</option>
        <option value="preco">Menor preço</option>
        <option value="data">Mais recente</option>
      </select>
    </div>
  );
}
