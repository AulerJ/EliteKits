"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types/database";

interface CategoriaFormProps {
  categoria?: Category;
}

interface Subcategoria {
  id: string;
  name: string;
  sort_order: number;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function CategoriaForm({ categoria }: CategoriaFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(categoria?.name ?? "");
  const [slug, setSlug] = useState(categoria?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(categoria?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(categoria?.is_active ?? true);

  const [subs, setSubs] = useState<Subcategoria[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [deletingSub, setDeletingSub] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setName(categoria?.name ?? "");
      setSlug(categoria?.slug ?? slugify(categoria?.name ?? ""));
      setSortOrder(categoria?.sort_order ?? 0);
      setIsActive(categoria?.is_active ?? true);
    }
  }, [open, categoria]);

  useEffect(() => {
    if (!open) {
      setSubs([]);
      setNewSubName("");
      return;
    }
    if (!categoria) return;
    const client = createClient();
    client
      .schema("favelastore")
      .from("category_sizes")
      .select("id, name, sort_order")
      .eq("category_id", categoria.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setSubs((data as Subcategoria[]) ?? []));
  }, [open, categoria?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (categoria) {
        await supabase
          .schema("favelastore")
          .from("categories")
          .update({ name, slug, sort_order: sortOrder, is_active: isActive })
          .eq("id", categoria.id);
      } else {
        await supabase.schema("favelastore").from("categories").insert({
          name,
          slug: slug || slugify(name),
          sort_order: sortOrder,
          is_active: isActive,
        });
      }
      router.refresh();
      if (!categoria) {
        setOpen(false);
        setName("");
        setSlug("");
        setSortOrder(0);
        setIsActive(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSub(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria || !newSubName.trim()) return;
    setAddingSub(true);
    try {
      await supabase.schema("favelastore").from("category_sizes").insert({
        category_id: categoria.id,
        name: newSubName.trim(),
        sort_order: subs.length,
      });
      setNewSubName("");
      router.refresh();
      const { data } = await supabase
        .schema("favelastore")
        .from("category_sizes")
        .select("id, name, sort_order")
        .eq("category_id", categoria.id)
        .order("sort_order", { ascending: true });
      setSubs((data as Subcategoria[]) ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSub(false);
    }
  }

  async function handleDeleteSub(id: string) {
    setDeletingSub(id);
    try {
      await supabase.schema("favelastore").from("category_sizes").delete().eq("id", id);
      router.refresh();
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingSub(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          categoria
            ? "rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
            : "flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-500"
        }
      >
        {categoria ? <Pencil className="h-4 w-4" /> : <><Plus className="h-4 w-4" /> Nova categoria</>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">
              {categoria ? "Editar categoria" : "Nova categoria"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!categoria) setSlug(slugify(e.target.value));
                  }}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Ordem</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="active" className="text-sm text-zinc-700">
                  Ativo (visível no catálogo)
                </label>
              </div>

              {/* Subcategorias - só ao editar */}
              {categoria && (
                <div className="border-t border-zinc-200 pt-4">
                  <label className="block text-sm font-medium text-zinc-700">
                    Subcategorias (tamanhos)
                  </label>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ex: S, M, L para Camisa ou 38, 40 para Bermuda. Depois você adiciona produtos em cada subcategoria.
                  </p>
                  <form onSubmit={handleAddSub} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="Ex: S, M, 38, 40..."
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      type="submit"
                      disabled={addingSub || !newSubName.trim()}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      {addingSub ? "..." : "Adicionar"}
                    </button>
                  </form>
                  <ul className="mt-3 space-y-1">
                    {subs.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-zinc-800">{s.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSub(s.id)}
                          disabled={deletingSub === s.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Excluir subcategoria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                    {subs.length === 0 && (
                      <li className="py-4 text-center text-sm text-zinc-500">
                        Nenhuma subcategoria. Adicione acima.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {!categoria && (
                <p className="text-xs text-zinc-500">
                  Salve a categoria e depois edite para adicionar subcategorias (tamanhos).
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
