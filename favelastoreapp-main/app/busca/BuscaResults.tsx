"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/components/CartContext";
import type { SearchProduct } from "@/lib/supabase/queries";

export function BuscaResults({
  camisaProducts,
  outrosProducts,
  allProducts,
  isAdmin,
  searchTerm,
  whatsappNumber,
  sizes,
  currentTamanho,
  hasCamisaResults,
}: {
  camisaProducts: SearchProduct[];
  outrosProducts: SearchProduct[];
  allProducts: SearchProduct[];
  isAdmin: boolean;
  searchTerm: string;
  whatsappNumber: string;
  sizes: string[];
  currentTamanho: string | null;
  /** Existe camisa na busca (antes do filtro), para mostrar a barra mesmo em "Outros produtos" */
  hasCamisaResults?: boolean;
}) {
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    if (searchTerm.length >= 2 && allProducts.length > 0 && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("favelastore_busca_ids", JSON.stringify(allProducts.map((p) => p.id)));
      sessionStorage.setItem("favelastore_busca_q", searchTerm);
    }
  }, [searchTerm, allProducts]);

  if (searchTerm.length < 2) {
    return null;
  }

  if (allProducts.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        Nenhum produto encontrado para &quot;{searchTerm}&quot;.
      </p>
    );
  }

  const baseUrl = "/busca";
  const query = (t?: string) => {
    const sp = new URLSearchParams();
    sp.set("q", searchTerm);
    if (t) sp.set("tamanho", t);
    return `${baseUrl}?${sp.toString()}`;
  };

  const currentNorm = (currentTamanho ?? "").toLowerCase();
  const sizeButtonClass = (s: string) => {
    const low = s.toLowerCase();
    const selected = currentNorm === low;
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

  const hasCamisas = camisaProducts.length > 0;
  const hasCamisasInSearch = hasCamisaResults ?? hasCamisas;
  const showSizeFilter =
    (hasCamisasInSearch && (sizes.length > 0 || outrosProducts.length > 0)) ||
    (currentNorm === "outros" && outrosProducts.length > 0);

  return (
    <>
      {showSizeFilter && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50 to-white px-3 py-2.5 shadow-sm">
          {hasCamisasInSearch && (
            <>
              <span className="text-xs font-semibold text-zinc-500 sm:text-sm">Trocar tamanho</span>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={query()}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                    !currentTamanho
                      ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/30"
                      : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200"
                  }`}
                >
                  Todos
                </Link>
                {sizes.map((s) => (
                  <Link
                    key={s}
                    href={query(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${sizeButtonClass(s)}`}
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </>
          )}
          {outrosProducts.length > 0 && (
            <Link
              href={query("outros")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                currentNorm === "outros"
                  ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/30"
                  : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200"
              }`}
            >
              Outros produtos
            </Link>
          )}
        </div>
      )}

      {camisaProducts.length === 0 && outrosProducts.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          {currentTamanho === "outros"
            ? `Nenhum outro produto para "${searchTerm}".`
            : currentTamanho
              ? `Nenhum produto no tamanho ${currentTamanho} para "${searchTerm}". Escolha outro tamanho acima.`
              : `Nenhum produto encontrado para "${searchTerm}".`}
        </p>
      ) : (
        <>
      {currentNorm !== "outros" && (camisaProducts.length > 0 || sizes.length > 0) && (
        <section className="mt-6">
          {camisaProducts.length > 0 && (
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">Camisas</h2>
          )}
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {camisaProducts.map((p) => (
        <li
          key={p.id}
          className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md transition hover:shadow-lg"
        >
          <Link
            href={`/produto/${p.id}`}
            className="block w-full text-left"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name ?? ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
                  Sem foto
                </div>
              )}
            </div>
          </Link>
          <div className="flex flex-1 flex-col p-3">
            <Link href={`/produto/${p.id}`} className="group">
              <p className="line-clamp-2 font-semibold text-zinc-900 group-hover:text-green-600">
                {p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i)
                  ? p.name
                  : p.id}
              </p>
            </Link>
            {(p.stock ?? 1) > 1 ? (
              <p className="mt-0.5 text-xs font-medium text-zinc-600">{(p.stock ?? 1)} unidades</p>
            ) : (
              <p className="mt-0.5 text-xs font-medium text-transparent select-none">.</p>
            )}
            {p.showSize && p.size != null && String(p.size).trim() !== "" && (
              <p className="mt-0.5 text-sm font-semibold text-zinc-700">
                Tamanho: {p.size}
              </p>
            )}
            <p className={`mt-0.5 text-sm font-semibold ${p.price != null ? "text-green-600" : "text-zinc-600"}`}>
              {p.price != null
                ? `US$ ${Number(p.price).toFixed(2)}`
                : "Sem preço"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  addItem(
                    {
                      id: p.id,
                      name: p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i) ? p.name : null,
                      price: p.price,
                      imageUrl: p.imageUrl,
                      size: p.showSize ? p.size ?? null : null,
                    },
                    1,
                    p.stock ?? null
                  );
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 min-w-0"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                Adicionar ao carrinho
              </button>
              {isAdmin && (
                <>
                  <Link
                    href={`/admin/produtos/${p.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-600"
                  >
                    Editar
                  </Link>
                  <DeleteButton
                    id={p.id}
                    onDeleted={() => router.refresh()}
                  />
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
        </section>
      )}

      {outrosProducts.length > 0 && (!currentTamanho || currentNorm === "outros") && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Outros produtos</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {outrosProducts.map((p) => (
              <li
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md transition hover:shadow-lg"
              >
                <Link href={`/produto/${p.id}`} className="block w-full text-left">
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <Link href={`/produto/${p.id}`} className="group">
                    <p className="line-clamp-2 font-semibold text-zinc-900 group-hover:text-green-600">
                      {p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i) ? p.name : p.id}
                    </p>
                  </Link>
                  {(p.stock ?? 1) > 1 ? (
                    <p className="mt-0.5 text-xs font-medium text-zinc-600">{(p.stock ?? 1)} unidades</p>
                  ) : (
                    <p className="mt-0.5 text-xs font-medium text-transparent select-none">.</p>
                  )}
                  {p.showSize && p.size != null && String(p.size).trim() !== "" && (
                    <p className="mt-0.5 text-sm font-semibold text-zinc-700">Tamanho: {p.size}</p>
                  )}
                  <p className={`mt-0.5 text-sm font-semibold ${p.price != null ? "text-green-600" : "text-zinc-600"}`}>
                    {p.price != null ? `US$ ${Number(p.price).toFixed(2)}` : "Sem preço"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        addItem(
                          {
                            id: p.id,
                            name: p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i) ? p.name : null,
                            price: p.price,
                            imageUrl: p.imageUrl,
                            size: p.showSize ? p.size ?? null : null,
                          },
                          1,
                          p.stock ?? null
                        );
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 min-w-0"
                    >
                      <ShoppingCart className="h-4 w-4 shrink-0" />
                      Adicionar ao carrinho
                    </button>
                    {isAdmin && (
                      <>
                        <Link
                          href={`/admin/produtos/${p.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-600"
                        >
                          Editar
                        </Link>
                        <DeleteButton id={p.id} onDeleted={() => router.refresh()} />
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
        </>
      )}
    </>
  );
}

function DeleteButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  async function handleDelete() {
    try {
      const supabase = createClient();
      // Buscar estoque atual
      const { data: row, error: fetchError } = await supabase
        .schema("favelastore")
        .from("products")
        .select("stock")
        .eq("id", id)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const currentStock = (row?.stock as number | null | undefined) ?? 1;

      // Se não há controle de estoque ou só 1 unidade: confirmar exclusão total e deletar
      if (!currentStock || currentStock <= 1) {
        if (!window.confirm("Excluir este produto? Esta ação não pode ser desfeita."))
          return;
        const { error } = await supabase
          .schema("favelastore")
          .from("products")
          .delete()
          .eq("id", id);
        if (error) throw error;
        onDeleted();
        return;
      }

      // Quando há mais de 1 unidade: perguntar quantas remover (default = 1)
      const input = window.prompt(
        `Este produto tem ${currentStock} unidades em estoque.\n\nQuantas unidades você quer remover?`,
        "1"
      );
      if (input === null) return; // usuário cancelou
      const qty = parseInt(input, 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        window.alert("Quantidade inválida. Nenhuma unidade foi removida.");
        return;
      }

      if (qty >= currentStock) {
        // Remover tudo equivale a excluir o produto
        if (
          !window.confirm(
            `Isso vai remover todas as ${currentStock} unidades e excluir o produto.\nTem certeza?`
          )
        )
          return;
        const { error } = await supabase
          .schema("favelastore")
          .from("products")
          .delete()
          .eq("id", id);
        if (error) throw error;
        onDeleted();
        return;
      }

      // Atualizar estoque, mantendo o produto
      const newStock = currentStock - qty;
      const { error: updateError } = await supabase
        .schema("favelastore")
        .from("products")
        .update({ stock: newStock })
        .eq("id", id);
      if (updateError) throw updateError;
      onDeleted();
    } catch {
      alert("Erro ao excluir. Tente novamente.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-500/70 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
      title="Excluir produto"
    >
      <Trash2 className="h-4 w-4" />
      Excluir
    </button>
  );
}
