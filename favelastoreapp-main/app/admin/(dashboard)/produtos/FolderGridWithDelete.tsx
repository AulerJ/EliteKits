"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  ChevronRight,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FolderItem {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  image_url?: string | null;
  is_active: boolean;
}

interface FolderGridWithDeleteProps {
  folders: FolderItem[];
  parentId: string | null;
}

export function FolderGridWithDelete({ folders, parentId }: FolderGridWithDeleteProps) {
  const router = useRouter();
  const [deleteMode, setDeleteMode] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<FolderItem[]>(() => [...folders]);

  useEffect(() => {
    if (!reorderMode) setOrder([...folders]);
  }, [folders, reorderMode]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === folders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(folders.map((f) => f.id)));
    }
  }

  async function handleExcluir() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} pasta(s)? Produtos e subpastas dentro delas também serão excluídos.`)) return;
    setLoading(true);
    try {
      const supabase = createClient();
      for (const id of selected) {
        await supabase.schema("favelastore").from("categories").delete().eq("id", id);
      }
      setDeleteMode(false);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  function cancelDeleteMode() {
    setDeleteMode(false);
    setSelected(new Set());
  }

  function cancelReorderMode() {
    setReorderMode(false);
    setOrder([...folders]);
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
    await saveOrder(newOrder);
  }

  async function handleMoveDown(index: number) {
    if (index >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
    await saveOrder(newOrder);
  }

  async function saveOrder(newOrder: FolderItem[]) {
    setLoading(true);
    try {
      const supabase = createClient();
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .schema("favelastore")
          .from("categories")
          .update({ sort_order: i })
          .eq("id", newOrder[i].id);
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar ordem.");
      setOrder([...folders]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility(folderId: string, nextVisible: boolean) {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .schema("favelastore")
        .from("categories")
        .update({ is_active: nextVisible })
        .eq("id", folderId);

      setOrder((current) =>
        current.map((folder) =>
          folder.id === folderId
            ? { ...folder, is_active: nextVisible }
            : folder
        )
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao atualizar visibilidade.");
    } finally {
      setLoading(false);
    }
  }

  const displayFolders = reorderMode ? order : folders;

  if (folders.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Barra com Reordenar e Excluir em cima */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setReorderMode(true);
              setOrder([...folders]);
              setDeleteMode(false);
            }}
            disabled={reorderMode}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              reorderMode
                ? "border-green-400 bg-green-50 text-green-700"
                : "border-zinc-300 text-zinc-600 hover:border-green-300 hover:bg-green-50/50 hover:text-green-700"
            }`}
            title="Reordenar pastas (a ordem aparece para os clientes)"
          >
            <ChevronUp className="h-4 w-4" />
            Reordenar
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteMode(true);
              setReorderMode(false);
            }}
            disabled={deleteMode}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              deleteMode
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-zinc-300 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            }`}
            title="Excluir pastas"
          >
            <Trash2 className="h-4 w-4" />
            Excluir pastas
          </button>
        </div>
        {reorderMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">
              Use as setas para mudar a ordem. A ordem é salva automaticamente.
            </span>
            <button
              type="button"
              onClick={cancelReorderMode}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <X className="h-4 w-4" />
              Concluir
            </button>
          </div>
        )}
        {deleteMode && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm font-medium text-zinc-600 underline hover:text-zinc-800"
            >
              {selected.size === folders.length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
            <span className="text-sm text-zinc-500">
              {selected.size} selecionada(s)
            </span>
            <button
              type="button"
              onClick={cancelDeleteMode}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExcluir}
              disabled={loading || selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? "Excluindo..." : `Excluir ${selected.size}`}
            </button>
          </div>
        )}
      </div>

      {deleteMode && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Marque as pastas que deseja excluir e clique em &quot;Excluir&quot; para confirmar.
        </p>
      )}

      {/* Grid de pastas - 2 por linha no mobile, nome no meio como na home */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {displayFolders.map((cat, index) => {
          const imageUrl = (cat as FolderItem & { image_url?: string | null }).image_url?.trim() || null;
          return (
            <div
              key={cat.id}
              className={`overflow-hidden rounded-xl border-2 shadow-sm transition ${
                deleteMode
                  ? selected.has(cat.id)
                    ? "border-red-300 bg-red-50/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                  : reorderMode
                    ? "border-zinc-200 bg-white"
                    : "border-zinc-200 bg-white hover:border-green-300 hover:shadow-md"
              }`}
            >
              {reorderMode ? (
                <div className="flex items-center gap-3 p-4">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || loading}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                      title="Subir"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === displayFolders.length - 1 || loading}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                      title="Descer"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" fill className="object-cover" sizes="56px" unoptimized={imageUrl.startsWith("http")} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-600">
                        <Folder className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-zinc-800">
                      {cat.name}
                    </span>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        cat.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {cat.is_active ? "Visível" : "Oculta"}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">{index + 1}º</span>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(cat.id, !cat.is_active)}
                    disabled={loading}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                    title={cat.is_active ? "Ocultar categoria" : "Mostrar categoria"}
                  >
                    {cat.is_active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : deleteMode ? (
                <button
                  type="button"
                  onClick={() => toggleSelect(cat.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(cat.id)}
                    onChange={() => toggleSelect(cat.id)}
                    className="h-5 w-5 shrink-0 rounded border-zinc-300"
                  />
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" fill className="object-cover" sizes="56px" unoptimized={imageUrl.startsWith("http")} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-600">
                        <Folder className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate font-semibold text-zinc-800">{cat.name}</span>
                </button>
              ) : (
                <Link
                  href={`/admin/produtos?parent=${encodeURIComponent(cat.id)}`}
                  className="group relative block overflow-hidden rounded-xl"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={cat.name}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 20vw"
                        unoptimized={imageUrl.startsWith("http")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-600">
                        <Folder className="h-16 w-16 opacity-80" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-zinc-900/60 transition group-hover:bg-zinc-900/50" />
                  </div>
                  {/* Nome no meio igual à home */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                    <div className="rounded-xl bg-black/75 px-3 py-3 shadow-xl backdrop-blur-md ring-1 ring-white/10 min-w-[70%]">
                      <span
                        className="block text-center text-sm font-bold uppercase tracking-wide text-white sm:text-base"
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                      >
                        {cat.name}
                      </span>
                      <span className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-zinc-200">
                        Abrir <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                  {!cat.is_active && (
                    <div className="absolute left-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                      Oculta
                    </div>
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
