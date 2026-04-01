"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function NovaCategoriaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
    }
  }, [open]);

  const DEFAULT_TAMANHOS = ["S", "M", "L", "XL", "XXL", "Feminina", "Infantil"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data: newCat, error: errCat } = await supabase
        .schema("favelastore")
        .from("categories")
        .insert({
          name: name.trim(),
          slug: (slug.trim() || slugify(name)).toLowerCase(),
          sort_order: 0,
          is_active: true,
        })
        .select("id")
        .single();

      if (errCat) {
        alert(`Erro ao criar categoria: ${errCat.message}`);
        setLoading(false);
        return;
      }

      if (newCat?.id) {
        const rows = DEFAULT_TAMANHOS.map((t, i) => ({
          category_id: newCat.id,
          name: t,
          sort_order: i,
        }));
        const { error: errSizes } = await supabase
          .schema("favelastore")
          .from("category_sizes")
          .insert(rows);
        if (errSizes) {
          alert(`Categoria criada, mas deu erro ao criar tamanhos: ${errSizes.message}`);
        }
      }

      router.refresh();
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar categoria. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white px-4 py-3 font-medium text-zinc-600 transition hover:border-green-300 hover:bg-green-50/50 hover:text-green-700"
      >
        <Plus className="h-5 w-5" />
        Nova categoria
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900">Nova categoria</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="Ex: Camisa, Bermuda..."
                  required
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {loading ? "..." : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
