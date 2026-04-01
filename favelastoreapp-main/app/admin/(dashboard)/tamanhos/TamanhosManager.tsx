"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TamanhosManagerProps {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
}

interface SizeRow {
  id: string;
  name: string;
  sort_order: number;
}

export function TamanhosManager({
  categoryId,
  categoryName,
  categorySlug,
}: TamanhosManagerProps) {
  const router = useRouter();
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchSizes() {
      const { data } = await supabase
        .schema("favelastore")
        .from("category_sizes")
        .select("id, name, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true });
      setSizes((data as SizeRow[]) ?? []);
      setLoading(false);
    }
    fetchSizes();
  }, [categoryId, supabase]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const nameToAdd = newName.trim();
    if (!nameToAdd) return;
    setAdding(true);
    setNewName("");
    try {
      await supabase.schema("favelastore").from("category_sizes").insert({
        category_id: categoryId,
        name: nameToAdd,
        sort_order: sizes.length,
      });
      router.refresh();
      const { data } = await supabase
        .schema("favelastore")
        .from("category_sizes")
        .select("id, name, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true });
      setSizes((data as SizeRow[]) ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await supabase.schema("favelastore").from("category_sizes").delete().eq("id", id);
      router.refresh();
      setSizes((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <div className="text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <h2 className="font-bold text-zinc-900">{categoryName}</h2>
        <p className="text-sm text-zinc-500">
          Adicione tamanhos como S, M, L ou numerações como 38, 40, 42. Ao deletar, produtos com esse tamanho continuam, mas o tamanho some do filtro.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-b border-zinc-200 p-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: S, M, 38, 40..."
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {adding ? "..." : "Adicionar"}
        </button>
      </form>

      <div className="divide-y divide-zinc-100">
        {sizes.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Nenhum tamanho ainda. Adicione o primeiro acima.
          </div>
        ) : (
          sizes.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium text-zinc-800">{s.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                disabled={deleting === s.id}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Excluir tamanho"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
