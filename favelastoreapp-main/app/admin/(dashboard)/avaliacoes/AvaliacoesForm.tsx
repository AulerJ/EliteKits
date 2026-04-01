"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { AlertCircle, ChevronDown, ChevronUp, Star, ThumbsUp, Trash2, Upload } from "lucide-react";
import { parseUploadResponse } from "@/lib/upload-response";

export function AvaliacoesForm({ initialImages }: { initialImages: string[] }) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/home-reviews");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setLoadingList(false);
      if (data.error === "permission_denied") {
        setPermissionError(data.message ?? "Sem permissão para ler as fotos.");
        return;
      }
      setPermissionError(null);
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      alert("Selecione apenas imagens (JPG, PNG, etc.).");
      return;
    }

    setUploading(true);
    try {
      const uploadOne = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", "favelastore/home-reviews");
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await parseUploadResponse(response);
        if (!response.ok) throw new Error(data.error || "Erro no envio");
        const url = data.url;
        return typeof url === "string" && url.trim().length > 0 ? url : null;
      };

      const results = await Promise.all(imageFiles.map((f) => uploadOne(f)));
      const newUrls = results.filter((u): u is string => u != null);
      if (newUrls.length > 0) {
        setImages((current) => [...current, ...newUrls]);
      }
      if (newUrls.length < imageFiles.length) {
        alert(`${newUrls.length} de ${imageFiles.length} foto(s) enviada(s). Alguma pode ter falhado.`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao enviar.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setImages((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index >= images.length - 1) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/home-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      alert("Carrossel salvo. A home foi atualizada.");
      setPermissionError(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-3xl space-y-6">
      {permissionError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Permissão negada (site_settings)</p>
            <p className="mt-1">{permissionError}</p>
            <p className="mt-2 text-amber-700">
              Abra o Supabase → SQL Editor, cole e execute o conteúdo do arquivo{" "}
              <code className="rounded bg-amber-100 px-1">supabase/scripts/fix-site-settings-permissions.sql</code>.
            </p>
          </div>
        </div>
      )}

      {loadingList && (
        <p className="text-sm text-zinc-500">Carregando fotos do carrossel...</p>
      )}

      <div className="rounded-3xl bg-gradient-to-b from-sky-100 via-white to-white p-5 shadow-[0_24px_80px_-48px_rgba(14,165,233,0.55)]">
        <div className="flex flex-wrap items-center justify-center gap-3 text-yellow-400">
          <ThumbsUp className="h-7 w-7 text-amber-500" fill="currentColor" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-6 w-6 fill-current" />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-lg font-semibold text-zinc-900">
          Pr&eacute;-visualiza&ccedil;&atilde;o do bloco de avalia&ccedil;&otilde;es
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          Adicionar foto
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-6 transition hover:border-green-400 hover:bg-green-50/30 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <Upload className="h-6 w-6 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-600">
            {uploading ? "Enviando..." : "Clique para enviar uma ou várias fotos"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Fotos do carrossel ({images.length}) — use as setas para reordenar
          </p>
          <ul className="space-y-2">
            {images.map((url, index) => (
              <li
                key={`${url}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30"
                    aria-label="Subir"
                  >
                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === images.length - 1}
                    className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30"
                    aria-label="Descer"
                  >
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>

                <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={url.startsWith("http")}
                  />
                </div>

                <span className="text-xs text-zinc-500">{index + 1}ª</span>

                <button
                  type="button"
                  onClick={() => removeAt(index)}
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
        className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar carrossel"}
      </button>
    </div>
  );
}
