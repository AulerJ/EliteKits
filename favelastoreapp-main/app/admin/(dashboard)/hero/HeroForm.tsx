"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { parseUploadResponse } from "@/lib/upload-response";

export function HeroForm({ initialImages }: { initialImages: string[] }) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "favelastore/hero");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await parseUploadResponse(res);
      if (!res.ok) throw new Error(data.error || "Erro no envio");
      const url = data.url;
      if (url) setImages((prev) => [...prev, url]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveUp(i: number) {
    if (i <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(i: number) {
    if (i >= images.length - 1) return;
    setImages((prev) => {
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      alert("Hero salvo. A página inicial foi atualizada.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Adicionar imagem</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-6 transition hover:border-green-400 hover:bg-green-50/30 ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="h-6 w-6 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-600">
            {uploading ? "Enviando..." : "Clique para enviar uma foto"}
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

      {images.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Imagens do hero ({images.length}) — 1 = estática, 2+ = carrossel
          </p>
          <ul className="space-y-2">
            {images.map((url, i) => (
              <li
                key={`${url}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
              >
                <div className="flex flex-col">
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30" aria-label="Subir">
                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === images.length - 1} className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30" aria-label="Descer">
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
                <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-100">
                  <Image src={url} alt="" fill className="object-cover" unoptimized={url.startsWith("http")} />
                </div>
                <span className="text-xs text-zinc-500">{i + 1}ª</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="ml-auto rounded p-2 text-red-600 hover:bg-red-50"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar hero"}
      </button>
    </div>
  );
}
