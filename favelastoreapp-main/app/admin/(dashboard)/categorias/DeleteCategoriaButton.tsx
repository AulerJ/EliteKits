"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DeleteCategoriaButtonProps {
  id: string;
  name: string;
}

export function DeleteCategoriaButton({ id, name }: DeleteCategoriaButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const supabase = createClient();

  async function handleDelete() {
    setLoading(true);
    try {
      await supabase.schema("favelastore").from("categories").delete().eq("id", id);
      router.refresh();
      setConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">Excluir?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg bg-red-600 px-2 py-1 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
      title={`Excluir ${name}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
