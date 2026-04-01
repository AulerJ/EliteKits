"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface NovaPastaButtonProps {
  parentId: string | null;
  className?: string;
}

export function NovaPastaButton({ parentId, className }: NovaPastaButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const DEFAULT_TAMANHOS = ["S", "M", "L", "XL", "XXL", "Feminina", "Infantil"];

  const BLOCKED_ROOT_SLUGS = ["camisas", "juliet"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const baseSlug = slugify(name.trim());
    if (!parentId && BLOCKED_ROOT_SLUGS.includes(baseSlug)) {
      alert('Não é possível criar uma pasta na raiz com o nome "Camisas" ou "Juliet". Use outro nome ou crie como subpasta.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      let slug = baseSlug;
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts < 5) {
        const { data: newCat, error } = await supabase
          .schema("favelastore")
          .from("categories")
          .insert({
            parent_id: parentId,
            name: name.trim(),
            slug,
            sort_order: 0,
            is_active: true,
          })
          .select("id, slug")
          .single();

        if (!error) {
          // Se criou uma pasta na raiz (ex: Camisa), cria automaticamente os tamanhos como subpastas
          if (!parentId && newCat?.id) {
            const parentSlug = newCat.slug;
            for (let i = 0; i < DEFAULT_TAMANHOS.length; i++) {
              const t = DEFAULT_TAMANHOS[i];
              const childSlug = `${parentSlug}-${slugify(t)}`;
              const { error: childErr } = await supabase.schema("favelastore").from("categories").insert({
                parent_id: newCat.id,
                name: t,
                slug: childSlug,
                sort_order: i + 1,
                is_active: true,
              });
              if (childErr) {
                // ignora duplicados, mas para em erros reais
                const msg = (childErr as any)?.message ? String((childErr as any).message) : "";
                if (!msg.toLowerCase().includes("duplicate")) throw new Error(childErr.message);
              }
            }
          }
          setOpen(false);
          setName("");
          router.refresh();
          return;
        }

        lastError = new Error(error.message);
        if (error.code === "23505") {
          slug = `${baseSlug}-${Date.now().toString(36)}`;
          attempts++;
        } else {
          throw lastError;
        }
      }
      throw lastError ?? new Error("Erro ao criar pasta");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao criar pasta.";
      alert(msg + "\n\nSe a coluna parent_id não existir, rode a migration no Supabase (SQL Editor).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-600 transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700 ${className ?? ""}`}
      >
        <FolderPlus className="h-5 w-5" />
        Nova pasta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900">Nova pasta</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {parentId ? "Criar subpasta na pasta atual" : "Criar pasta na raiz"}
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Camisa, Tamanho P, Óculos..."
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
                  onClick={() => { setOpen(false); setName(""); }}
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
