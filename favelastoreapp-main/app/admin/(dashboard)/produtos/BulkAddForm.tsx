"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseUploadResponse } from "@/lib/upload-response";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductItem {
  name: string;
  storage_path: string;
  url: string;
  price?: string;
}

interface BulkAddFormProps {
  categories: Category[];
  sizesByCategory?: Record<string, string[]>;
  initialCategoryId?: string;
  initialCategorySlug?: string;
  initialTamanho?: string;
  /** Só categorias irmãs (ex.: outros tamanhos) para "Também adicionar"; quando vazio, a seção não aparece */
  alsoCategoryOptions?: Category[];
}

export function BulkAddForm({
  categories,
  sizesByCategory = {},
  initialCategoryId,
  initialCategorySlug,
  initialTamanho,
  alsoCategoryOptions = [],
}: BulkAddFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const initialCat = initialCategoryId
    ? categories.find((c) => c.id === initialCategoryId)
    : initialCategorySlug
      ? categories.find((c) => c.slug === initialCategorySlug)
      : null;
  const isFixedCategory = !!initialCategoryId;
  const [categoryIdState, setCategoryIdState] = useState(initialCat?.id ?? categories[0]?.id ?? "");
  const categoryId = isFixedCategory ? (initialCat?.id ?? "") : categoryIdState;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [priceAll, setPriceAll] = useState("");
  const [size, setSize] = useState(initialTamanho ?? "");
  const [items, setItems] = useState<ProductItem[]>([]);

  const DRAFT_KEY = "favelastore-bulk-add-draft";

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
      if (!raw) return;
      const data = JSON.parse(raw) as { items?: ProductItem[]; categoryId?: string };
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        if (data.categoryId && !initialCategoryId) setCategoryIdState(data.categoryId);
      }
    } catch (_) {}
  }, [initialCategoryId]);

  useEffect(() => {
    if (items.length === 0) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ items, categoryId })
      );
    } catch (_) {}
  }, [items, categoryId]);

  const categorySizes = sizesByCategory[categoryId] ?? [];
  const hasSizes = !isFixedCategory && categorySizes.length > 0;
  const [alsoCategoryIds, setAlsoCategoryIds] = useState<string[]>([]);
  const supabase = createClient();

  // "Também adicionar" só mostra opções passadas (categorias irmãs, ex.: outros tamanhos)
  const otherCategories = alsoCategoryOptions.length > 0 ? alsoCategoryOptions.filter((c) => c.id !== categoryId) : [];

  function getErrorMessage(err: unknown): string {
    if (err == null) return "Erro desconhecido";
    const e = err as { message?: string; code?: string; details?: string };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.code === "string" && e.code) return `Código: ${e.code}`;
    if (typeof e.details === "string" && e.details) return e.details;
    try {
      const s = JSON.stringify(err);
      if (s !== "{}") return s;
    } catch (_) {}
    return String(err);
  }

  function extractNameAndPrice(filename: string): { name: string; price: string | null } {
    // Remove extensão
    const withoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Tenta encontrar preço no formato $XX, US$ XX, XX,XX ou XX.XX
    const pricePatterns = [
      /\$?\s*(\d+[,.]?\d*)\s*$/i,  // $50, US$ 50, 50 no final
      /(\d+[,.]\d{2})\s*$/,        // 50,00 ou 50.00 no final
      /(\d+)\s*$/                  // 50 no final (sem centavos)
    ];
    
    let price: string | null = null;
    let name = ""; // Sempre começa vazio - não copia nome do arquivo/pasta
    
    // Apenas extrai o preço, se existir
    for (const pattern of pricePatterns) {
      const match = withoutExt.match(pattern);
      if (match) {
        const priceStr = match[1].replace(",", ".");
        const numPrice = parseFloat(priceStr);
        if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
          price = numPrice.toFixed(2);
          break;
        }
      }
    }
    
    return { name, price };
  }

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        const newItems: ProductItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.set("file", file);
          formData.set("folder", "favelastore/produtos");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await parseUploadResponse(res);
          if (!res.ok) {
            const hint = data.error?.trim()
              ? data.error
              : `Falha no servidor (HTTP ${res.status}). Veja o terminal do Next.js ou configure Cloudinary / bucket favelastore_products no Supabase.`;
            throw new Error(hint);
          }
          if (!data.url) continue;
          const { name, price } = extractNameAndPrice(file.name);
          newItems.push({
            name,
            price: price || undefined,
            storage_path: "",
            url: data.url,
          });
        }
        setItems((prev) => [...prev, ...newItems]);
      } catch (err: unknown) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Erro no upload. Verifique se está logado e se o Cloudinary está configurado.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateName = (idx: number, name: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name } : item)));
  };

  const updatePrice = (idx: number, price: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, price } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const BATCH_SIZE = 25;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      alert("Adicione pelo menos uma foto.");
      return;
    }
    if (hasSizes && !size) {
      alert("Selecione o tamanho.");
      return;
    }
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const baseTimestamp = Date.now();
      // Slug único por categoria (evita duplicate key em M, L, XL)
      const slugUsedPerCategory: Record<string, Set<string>> = {};
      const allTargetIds = [categoryId, ...alsoCategoryIds];
      for (const cid of allTargetIds) {
        slugUsedPerCategory[cid] = new Set<string>();
        const { data: rows } = await supabase
          .schema("favelastore")
          .from("products")
          .select("slug")
          .eq("category_id", cid);
        (rows ?? []).forEach((r: { slug?: string }) => {
          if (r.slug) slugUsedPerCategory[cid].add(r.slug);
        });
      }

      const copiesPerItem = 1 + alsoCategoryIds.length;

      for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
        const batch = items.slice(offset, offset + BATCH_SIZE);
        const productRows: Array<{
          category_id: string;
          name: string;
          slug: string;
          price: number | null;
          size: string | null;
          is_active: boolean;
          sort_order: number;
        }> = [];

        for (let idx = 0; idx < batch.length; idx++) {
          const item = batch[idx];
          const i = offset + idx;
          const name = item.name.trim() || "";
          const baseSlug = name ? slugify(name) : `produto-${baseTimestamp}-${i}-${Math.random().toString(36).substring(2, 9)}`;
          const itemPrice = item.price?.trim();
          const finalPrice = itemPrice ? parseFloat(itemPrice) : (priceAll ? parseFloat(priceAll) : null);
          const finalName = name || baseSlug;
          const sizeVal = hasSizes && size ? size : null;

          function uniqueSlugForCategory(catId: string, base: string): string {
            let slug = base;
            const used = slugUsedPerCategory[catId];
            while (used.has(slug)) {
              slug = `${base}-${Math.random().toString(36).substring(2, 7)}`;
            }
            used.add(slug);
            return slug;
          }

          // Um produto na categoria principal
          const slugMain = uniqueSlugForCategory(categoryId, baseSlug);
          productRows.push({
            category_id: categoryId,
            name: finalName,
            slug: slugMain,
            price: finalPrice != null && !isNaN(finalPrice) ? finalPrice : null,
            size: sizeVal,
            is_active: true,
            sort_order: i,
          });
          // Mesmo produto nas "também adicionar" (slug único em cada categoria)
          for (const alsoId of alsoCategoryIds) {
            const alsoCat = categories.find((cc) => cc.id === alsoId);
            const alsoSize = alsoCat?.name?.split(" › ").pop()?.trim() ?? sizeVal;
            const slugAlso = uniqueSlugForCategory(alsoId, baseSlug);
            productRows.push({
              category_id: alsoId,
              name: finalName,
              slug: slugAlso,
              price: finalPrice != null && !isNaN(finalPrice) ? finalPrice : null,
              size: alsoSize || null,
              is_active: true,
              sort_order: i,
            });
          }
        }

        const { data: insertedProducts, error: productError } = await supabase
          .schema("favelastore")
          .from("products")
          .insert(productRows)
          .select("id");

        if (productError) {
          const msg = getErrorMessage(productError);
          console.error("Erro ao criar produtos (lote):", productError);
          alert(`Erro ao criar produtos (${offset + 1}–${offset + batch.length}): ${msg}`);
          throw productError;
        }

        if (!insertedProducts?.length) {
          throw new Error("Nenhum produto retornado do banco");
        }

        // Cada item do batch gera copiesPerItem produtos; a imagem do item vai para todos eles
        const imageRows = insertedProducts.map((p, productIdx) => {
          const itemIdx = Math.floor(productIdx / copiesPerItem);
          const item = batch[itemIdx];
          return {
            product_id: p.id,
            storage_path: item.storage_path,
            url: item.url,
            sort_order: 0,
          };
        });

        const { error: imageError } = await supabase
          .schema("favelastore")
          .from("product_images")
          .insert(imageRows);

        if (imageError) {
          console.error("Erro ao inserir imagens:", imageError);
          alert(`Erro ao salvar imagens: ${getErrorMessage(imageError)}`);
        }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (_) {}
      const back = `/admin/produtos${categoryId ? `?parent=${encodeURIComponent(categoryId)}` : ""}`;
      router.push(back);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + getErrorMessage(err));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <Link
        href={categoryId ? `/admin/produtos?parent=${encodeURIComponent(categoryId)}` : "/admin/produtos"}
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex flex-wrap gap-6">
        {isFixedCategory ? (
          <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
            Adicionando em: <strong>{initialCat?.name ?? "—"}</strong>
          </p>
        ) : (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Categoria</label>
            <select
              value={categoryIdState}
              onChange={(e) => setCategoryIdState(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-300 px-4 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {hasSizes && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Tamanho</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-300 px-4 py-2"
            >
              <option value="">Selecione</option>
              {categorySizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Preço padrão em US$ (para todos)</label>
          <input
            type="number"
            step="0.01"
            value={priceAll}
            onChange={(e) => setPriceAll(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-32 rounded-lg border border-zinc-300 px-4 py-2"
          />
          <p className="mt-1 text-xs text-zinc-500">Preencha no produto para usar preço diferente</p>
        </div>
      </div>

      {otherCategories.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-medium text-amber-900">Também adicionar nas categorias (mesmo nome, foto e preço)</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Marque outras categorias (ex.: outros tamanhos) para criar o mesmo produto nelas sem repetir foto e nome.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {otherCategories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm hover:bg-amber-50">
                <input
                  type="checkbox"
                  checked={alsoCategoryIds.includes(c.id)}
                  onChange={(e) => {
                    if (e.target.checked) setAlsoCategoryIds((prev) => [...prev, c.id]);
                    else setAlsoCategoryIds((prev) => prev.filter((id) => id !== c.id));
                  }}
                  className="h-4 w-4 rounded border-amber-400 text-green-600 focus:ring-amber-500"
                />
                <span className="text-zinc-800">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Fotos</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-8 transition hover:border-green-400 hover:bg-green-50/30 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <Upload className="h-12 w-12 text-zinc-400" />
          <p className="mt-2 text-center text-zinc-600">
            Clique ou arraste várias fotos aqui
          </p>
          <p className="text-sm text-zinc-500">Pode selecionar várias de uma vez</p>
          <p className="mt-1 text-xs text-zinc-400">
            Funciona mesmo se baixar do Google Drive sem extensão
          </p>
          {uploading && <p className="mt-2 text-sm text-green-600">Enviando...</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.gif,.webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">
            {items.length} foto{items.length > 1 ? "s" : ""} — nome e preço opcionais (edite depois se quiser)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                      src={item.url}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateName(idx, e.target.value)}
                      placeholder="Nome (opcional)"
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.price ?? ""}
                      onChange={(e) => updatePrice(idx, e.target.value)}
                      placeholder={`US$ (ou padrão: ${priceAll || "—"})`}
                      className="mt-1.5 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {loading
            ? "Salvando..."
            : (() => {
                const total = items.length * (1 + alsoCategoryIds.length);
                return `Salvar ${total} produto${total !== 1 ? "s" : ""}${alsoCategoryIds.length > 0 ? ` (${items.length} foto${items.length !== 1 ? "s" : ""} × ${1 + alsoCategoryIds.length} categorias)` : ""}`;
              })()}
        </button>
        <Link
          href={categoryId ? `/admin/produtos?parent=${encodeURIComponent(categoryId)}` : "/admin/produtos"}
          className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
