import Link from "next/link";
import { ArrowLeft, TrendingUp, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  price: number | null;
  stock: number | null;
  categories: { name: string | null } | { name: string | null }[] | null;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function ValorEstoquePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .schema("favelastore")
    .from("products")
    .select("id, price, stock, categories(name)")
    .eq("is_active", true);

  const rows = (Array.isArray(products) ? products : []) as unknown as ProductRow[];
  const categoryTotals = new Map<string, { value: number; count: number }>();

  let totalValue = 0;
  let totalUnits = 0;

  for (const p of rows) {
    const price = p.price ?? 0;
    const qty = Math.max(1, p.stock ?? 1);
    const value = price * qty;
    totalValue += value;
    totalUnits += qty;

    const cat = p.categories;
    const catName = (
      Array.isArray(cat) ? cat[0]?.name : (cat as { name?: string | null } | null)?.name
    );
    const name = (catName ?? "").trim() || "Sem categoria";
    const prev = categoryTotals.get(name) ?? { value: 0, count: 0 };
    categoryTotals.set(name, {
      value: prev.value + value,
      count: prev.count + qty,
    });
  }

  const sortedCategories = Array.from(categoryTotals.entries()).sort(
    (a, b) => b[1].value - a[1].value
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/admin/vendas"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às vendas
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Valor do estoque</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Quanto você ganharia se vendesse todo o estoque (preço × quantidade por produto).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50/80 to-white p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-600">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Total se vendesse tudo
          </p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {formatUsd(totalValue)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {rows.length} produto(s) · {totalUnits} unidade(s)
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Produtos ativos</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Unidades no estoque</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalUnits}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900">
          <Package className="h-5 w-5" />
          Por categoria
        </h2>
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum produto ativo com categoria.</p>
        ) : (
          <ul className="space-y-3">
            {sortedCategories.map(([name, { value, count }]) => (
              <li
                key={name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3"
              >
                <span className="font-medium text-zinc-900">{name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-500">{count} un.</span>
                  <span className="font-semibold text-green-600">{formatUsd(value)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
