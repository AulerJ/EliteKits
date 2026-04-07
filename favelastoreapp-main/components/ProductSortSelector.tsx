"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

export function ProductSortSelector() {
  const ac = publicStorefrontAccent();
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
        className={ac.sortSelect}
      >
        <option value="padrao">Padrão</option>
        <option value="preco">Menor preço</option>
        <option value="data">Mais recente</option>
      </select>
    </div>
  );
}
