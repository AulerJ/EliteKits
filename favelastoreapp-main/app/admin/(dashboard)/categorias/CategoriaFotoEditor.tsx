"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCategoryConfig } from "@/lib/categories";
import { parseUploadResponse } from "@/lib/upload-response";

interface CategoriaFotoEditorProps {
  categoryId: string;
  name: string;
  slug: string;
  currentImageUrl: string | null;
}

export function CategoriaFotoEditor({
  categoryId,
  name,
  slug,
  currentImageUrl,
}: CategoriaFotoEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(currentImageUrl ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage =
    currentImageUrl?.trim() ||
    getCategoryConfig(slug).image;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "favelastore/categorias");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await parseUploadResponse(res);
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      if (data.url) setUrl(data.url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro no upload. Verifique se o Cloudinary está configurado.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .schema("favelastore")
        .from("categories")
        .update({ image_url: url.trim() || null })
        .eq("id", categoryId);
      router.refresh();
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-white text-left transition hover:border-green-300"
      >
        <div className="aspect-[4/5] overflow-hidden bg-zinc-100">
          <Image
            src={displayImage}
            alt={name}
            width={300}
            height={375}
            className="h-full w-full object-cover transition group-hover:scale-105"
            unoptimized={displayImage.startsWith("blob:") || displayImage.includes("supabase")}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            <Pencil className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="p-3">
          <span className="font-semibold text-zinc-800">{name}</span>
          <p className="text-xs text-zinc-500">Clique para trocar a foto</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900">Foto: {name}</h2>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">URL da imagem</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Ou envie um arquivo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-6 transition hover:border-green-400 hover:bg-green-50/30"
                >
                  <Upload className="h-6 w-6 text-zinc-500" />
                  <span className="text-sm text-zinc-600">
                    {uploading ? "Enviando..." : "Clique para selecionar"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2">
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
