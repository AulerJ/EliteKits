"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function getImageUrl(images: { url?: string | null; storage_path?: string }[] | null) {
  const img = images?.[0];
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path)
    return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

export function ProdutoCard({
  produto,
  returnTo,
}: {
  produto: {
    id: string;
    name: string;
    price: number | null;
    size?: string | null;
    stock?: number | null;
    is_active: boolean;
    categories: { name: string } | null;
    product_images: { url: string | null; storage_path: string }[] | null;
  };
  returnTo?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const imgUrl = getImageUrl(produto.product_images);
  const editHref = `/admin/produtos/${produto.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ""}`;

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();
      // Buscar estoque atual
      const { data: row, error: fetchError } = await supabase
        .schema("favelastore")
        .from("products")
        .select("stock")
        .eq("id", produto.id)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const currentStock = (row?.stock as number | null | undefined) ?? 1;

      // Se não há controle de estoque ou só 1 unidade: excluir produto inteiro
      if (!currentStock || currentStock <= 1) {
        const { error } = await supabase
          .schema("favelastore")
          .from("products")
          .delete()
          .eq("id", produto.id);
        if (error) throw error;
        router.refresh();
        return;
      }

      // Com mais de uma unidade: perguntar quantas remover (default = 1)
      const input = window.prompt(
        `Este produto tem ${currentStock} unidades em estoque.\n\nQuantas unidades você quer remover?`,
        "1"
      );
      if (input === null) return;
      const qty = parseInt(input, 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        window.alert("Quantidade inválida. Nenhuma unidade foi removida.");
        return;
      }

      if (qty >= currentStock) {
        // Remover tudo = excluir produto
        if (
          !window.confirm(
            `Isso vai remover todas as ${currentStock} unidades e excluir o produto.\nTem certeza?`
          )
        ) {
          return;
        }
        const { error } = await supabase
          .schema("favelastore")
          .from("products")
          .delete()
          .eq("id", produto.id);
        if (error) throw error;
        router.refresh();
        return;
      }

      // Atualizar estoque mantendo o produto
      const newStock = currentStock - qty;
      const { error: updateError } = await supabase
        .schema("favelastore")
        .from("products")
        .update({ stock: newStock })
        .eq("id", produto.id);
      if (updateError) throw updateError;
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <Link href={editHref} className="block">
        <div className="aspect-square bg-zinc-100">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={produto.name || "Produto"}
              width={400}
              height={400}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              Sem foto
            </div>
          )}
        </div>
        {(produto.name || produto.price != null || produto.categories?.name || produto.size) && (
          <div className="p-4">
            {produto.name &&
             !produto.name.match(/^produto\s*-?\s*\d+$/i) &&
             produto.name.trim() !== "" && (
              <h3 className="font-semibold text-zinc-900">{produto.name}</h3>
            )}
            {(produto.stock ?? 1) > 1 && (
              <p className="mt-0.5 text-xs font-medium text-zinc-600">{(produto.stock ?? 1)} unidades</p>
            )}
            {produto.categories?.name && (
              <p className={`text-sm text-zinc-500 ${produto.name ? "" : ""}`}>
                {produto.categories.name}
              </p>
            )}
            {produto.price != null && (
              <p className={`font-medium text-green-600 ${produto.name || produto.categories?.name ? "mt-1" : ""}`}>
                US$ {Number(produto.price).toFixed(2)}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {produto.size && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {produto.size}
                </span>
              )}
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                  produto.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {produto.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        )}
      </Link>
      <div className="flex items-center gap-2 border-t border-zinc-200/80 px-4 pt-3 pb-4">
        <Link
          href={editHref}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        {confirm ? (
          <>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "..." : "Sim"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Não
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="rounded-lg p-2.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
