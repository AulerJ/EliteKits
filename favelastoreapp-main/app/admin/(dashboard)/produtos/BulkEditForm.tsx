"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function getImageUrl(images: { url?: string | null; storage_path?: string }[] | null) {
  const img = images?.[0];
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path)
    return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  size: string | null;
  sort_order: number;
  product_images: { url: string | null; storage_path: string }[] | null;
};

export function BulkEditForm({ parentId, products }: { parentId: string; products: ProductRow[] }) {
  const router = useRouter();
  const isSubmittingRef = useRef(false);
  const [rows, setRows] = useState(
    products.map((p) => {
      const name = p.name ?? "";
      const isAutoName = !name || /^produto\s*-?\s*\d+/i.test(name) || name === p.slug;
      return {
        id: p.id,
        name: isAutoName ? "" : name,
        slug: p.slug,
        price: p.price != null ? String(p.price) : "",
        imgUrl: getImageUrl(p.product_images),
        toDelete: false,
      };
    })
  );

  const updateName = (id: string, name: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const updatePrice = (id: string, price: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, price } : r)));
  };

  const setToDelete = (id: string, toDelete: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, toDelete } : r)));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current || rows.length === 0) return;
    isSubmittingRef.current = true;

    const supabase = createClient();
    try {
      const toDeleteIds = rows.filter((r) => r.toDelete).map((r) => r.id);
      const toUpdate = rows.filter((r) => !r.toDelete);

      for (const id of toDeleteIds) {
        await supabase.schema("favelastore").from("products").delete().eq("id", id);
      }

      for (const row of toUpdate) {
        const nameTrim = row.name.trim();
        const finalName = nameTrim || row.slug;
        const finalPrice = row.price.trim() ? parseFloat(row.price.replace(",", ".")) : null;
        const numPrice = finalPrice != null && !isNaN(finalPrice) ? finalPrice : null;

        await supabase
          .schema("favelastore")
          .from("products")
          .update({
            name: finalName,
            price: numPrice,
          })
          .eq("id", row.id);
      }

      router.push(`/admin/produtos?parent=${encodeURIComponent(parentId)}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      isSubmittingRef.current = false;
    }
  }

  if (products.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-600">Nenhum produto nesta pasta.</p>
        <Link
          href={parentId ? `/admin/produtos?parent=${encodeURIComponent(parentId)}` : "/admin/produtos"}
          className="mt-4 inline-block text-green-600 hover:underline"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const backHref = parentId ? `/admin/produtos?parent=${encodeURIComponent(parentId)}` : "/admin/produtos";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <p className="mb-2 text-sm text-zinc-500">
        Marque &quot;Excluir&quot; para remover o produto ao salvar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`flex gap-3 rounded-xl border p-3 ${
              row.toDelete ? "border-red-300 bg-red-50/50" : "border-zinc-200 bg-white"
            }`}
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {row.imgUrl ? (
                <Image
                  src={row.imgUrl}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-zinc-200" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 flex items-center gap-2 text-xs text-red-600">
                <input
                  type="checkbox"
                  checked={row.toDelete}
                  onChange={(e) => setToDelete(row.id, e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Excluir
              </label>
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateName(row.id, e.target.value)}
                placeholder="Nome (deixe vazio para sem nome)"
                disabled={row.toDelete}
                className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none disabled:opacity-50"
              />
              <input
                type="text"
                inputMode="decimal"
                value={row.price}
                onChange={(e) => updatePrice(row.id, e.target.value)}
                placeholder="US$"
                disabled={row.toDelete}
                className="mt-1.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500"
        >
          Salvar tudo
        </button>
        <Link
          href={backHref}
          className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

