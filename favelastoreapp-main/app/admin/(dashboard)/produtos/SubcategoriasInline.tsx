"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SubcategoriasInlineProps {
  categoryId: string;
  categorySlug: string;
  subcategorias: { id: string; name: string }[];
  selectedTamanho?: string;
}

  const DEFAULT_TAMANHOS = ["S", "M", "L", "XL", "XXL", "Feminina", "Infantil"];

export function SubcategoriasInline({
  categoryId,
  categorySlug,
  subcategorias,
  selectedTamanho,
}: SubcategoriasInlineProps) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await supabase.schema("favelastore").from("category_sizes").insert({
        category_id: categoryId,
        name: newName.trim(),
        sort_order: subcategorias.length,
      });
      setNewName("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleAddAll() {
    setAddingAll(true);
    try {
      for (let i = 0; i < DEFAULT_TAMANHOS.length; i++) {
        const { error } = await supabase.schema("favelastore").from("category_sizes").insert({
          category_id: categoryId,
          name: DEFAULT_TAMANHOS[i],
          sort_order: i,
        });
        // Se já existir (unique category_id+name), ignora e continua
        if (error) {
          const msg = (error as any)?.message ? String((error as any).message) : "";
          if (!msg.toLowerCase().includes("duplicate")) throw error;
        }
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar tamanhos padrão.");
    } finally {
      setAddingAll(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    try {
      await supabase.schema("favelastore").from("category_sizes").delete().eq("id", id);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  const cardBase =
    "flex items-center justify-between rounded-xl border-2 bg-white p-4 shadow-sm transition";
  const cardLink =
    "border-zinc-200 hover:border-green-300 hover:bg-green-50/50";
  const cardSelected = "border-green-400 bg-green-50 text-green-800";

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-600">
        Subcategorias (tamanhos) — crie S, M, L, XL, XXL, Feminina, Infantil.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Nova subcategoria — mesmo estilo da Nova categoria */}
        {showForm ? (
          <form
            onSubmit={handleAdd}
            className={`${cardBase} border-dashed border-zinc-300`}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: S, M, 38..."
              autoFocus
              className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />
            <div className="flex gap-1">
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
              >
                {adding ? "..." : "OK"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewName(""); }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={`${cardBase} border-dashed border-zinc-300 hover:border-green-300 hover:bg-green-50/50`}
          >
            <span className="flex items-center gap-2 font-medium text-zinc-600">
              <Plus className="h-5 w-5" />
              Nova subcategoria
            </span>
          </button>
        )}

        {/* Adicionar todos os tamanhos de uma vez (quando vazio) */}
        {subcategorias.length === 0 && (
          <button
            type="button"
            onClick={handleAddAll}
            disabled={addingAll}
            className={`${cardBase} border-dashed border-green-300 bg-green-50/50 hover:border-green-400 hover:bg-green-100/50`}
          >
            <span className="font-medium text-green-700">
              {addingAll ? "Adicionando..." : "Adicionar S, M, L, XL, XXL, Feminina, Infantil"}
            </span>
          </button>
        )}

        {/* Cards das subcategorias — mesmo estilo das categorias */}
        {subcategorias.map((s) => (
          <Link
            key={s.id}
            href={`/admin/produtos?categoria=${encodeURIComponent(categorySlug)}&tamanho=${encodeURIComponent(s.name)}`}
            className={`${cardBase} ${selectedTamanho === s.name ? cardSelected : cardLink}`}
          >
            <span className="font-semibold text-zinc-800">{s.name}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => handleDelete(e, s.id)}
                disabled={deleting === s.id}
                className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronLeft className="h-5 w-5 -scale-x-100 text-zinc-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
