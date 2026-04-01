"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseUploadResponse } from "@/lib/upload-response";
import type { HomeSectionId } from "@/lib/supabase/queries";

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

interface ProductImage {
  id?: string;
  storage_path: string;
  url?: string | null;
  sort_order?: number;
}

interface ProdutoFormProps {
  returnTo?: string;
  sizesByCategory?: Record<string, string[]>;
    produto?: {
    id: string;
    category_id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number | null;
    size?: string | null;
    stock?: number | null;
    sizes?: string[] | null;
    shopify_product_url?: string | null;
    is_active: boolean;
    sort_order: number;
    product_images?: ProductImage[];
  };
  categories: Category[];
  initialFeaturedProductIds?: string[];
  initialSectionOrder?: HomeSectionId[];
}

export function ProdutoForm({
  produto,
  categories,
  sizesByCategory = {},
  initialFeaturedProductIds = [],
  initialSectionOrder = [],
  returnTo,
}: ProdutoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(produto?.name ?? "");
  const [description, setDescription] = useState(produto?.description ?? "");
  const [price, setPrice] = useState(produto?.price?.toString() ?? "");
  const [categoryId, setCategoryId] = useState(produto?.category_id ?? categories[0]?.id ?? "");
  const [size, setSize] = useState<string>(produto?.size ?? "");
  const [stock, setStock] = useState<string>(produto?.stock != null ? String(produto.stock) : "1");
  const [shopifyProductUrl, setShopifyProductUrl] = useState<string>(produto?.shopify_product_url ?? "");
  const categorySizes = sizesByCategory[categoryId] ?? [];
  const hasSizes = categorySizes.length > 0;
  const [isActive, setIsActive] = useState(produto?.is_active ?? true);
  const [isFeaturedOnHome, setIsFeaturedOnHome] = useState(
    produto ? initialFeaturedProductIds.includes(produto.id) : false
  );
  const [images, setImages] = useState<ProductImage[]>(
    produto?.product_images?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) ?? []
  );

  const supabase = createClient();


  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.set("file", files[i]);
          formData.set("folder", "favelastore/produtos");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await parseUploadResponse(res);
          if (!res.ok) throw new Error(data.error || "Erro no upload");
          setImages((prev) => [...prev, { storage_path: data.storage_path || data.url || "", url: data.url }]);
        }
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Erro no upload");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const stockNum = stock.trim() ? parseInt(stock, 10) : 1;
      let finalSlug = slugify(name.trim() || "produto");

      const { data: slugConflict } = await supabase
        .schema("favelastore")
        .from("products")
        .select("id")
        .eq("category_id", categoryId)
        .eq("slug", finalSlug)
        .limit(1);
      const conflictExcludingSelf = produto
        ? slugConflict?.filter((r) => r.id !== produto.id) ?? []
        : slugConflict ?? [];
      if (conflictExcludingSelf.length > 0) {
        finalSlug = produto
          ? `${finalSlug}-${produto.id.slice(0, 8)}`
          : `${finalSlug}-${Date.now().toString(36)}`;
      }

      const payload = {
        name,
        slug: finalSlug,
        description: description || null,
        price: price ? parseFloat(price) : null,
        category_id: categoryId,
        size: hasSizes && size ? size : null,
        stock: isNaN(stockNum) || stockNum < 1 ? 1 : stockNum,
        shopify_product_url: shopifyProductUrl.trim() || null,
        is_active: isActive,
        sort_order: produto?.sort_order ?? 0,
      };

      if (produto) {
        const { error: updateError } = await supabase
          .schema("favelastore")
          .from("products")
          .update(payload)
          .eq("id", produto.id);
        if (updateError) throw updateError;

        const existingIds = images.filter((i) => i.id).map((i) => i.id!);
        const toDelete = (produto.product_images ?? [])
          .filter((pi: ProductImage) => pi.id && !existingIds.includes(pi.id))
          .map((pi: ProductImage) => pi.id!);
        if (toDelete.length) {
          await supabase.schema("favelastore").from("product_images").delete().in("id", toDelete);
        }

        const newImages = images.filter((i) => !i.id);
        for (let i = 0; i < newImages.length; i++) {
          await supabase.schema("favelastore").from("product_images").insert({
            product_id: produto.id,
            storage_path: newImages[i].storage_path,
            url: newImages[i].url,
            sort_order: images.indexOf(newImages[i]),
          });
        }

        const nextFeaturedIds = isFeaturedOnHome
          ? initialFeaturedProductIds.includes(produto.id)
            ? initialFeaturedProductIds
            : [...initialFeaturedProductIds, produto.id]
          : initialFeaturedProductIds.filter((id) => id !== produto.id);

        if (
          JSON.stringify(nextFeaturedIds) !==
          JSON.stringify(initialFeaturedProductIds)
        ) {
          const configResponse = await fetch("/api/home-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              featuredProductIds: nextFeaturedIds,
              sectionOrder: initialSectionOrder,
            }),
          });

          if (!configResponse.ok) {
            const data = await configResponse.json().catch(() => null);
            throw new Error(
              data?.error || "Produto salvo, mas não foi possível atualizar o destaque da home."
            );
          }
        }
      } else {
        const { data: newProduct, error } = await supabase
          .schema("favelastore")
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (newProduct && images.length) {
          await supabase.schema("favelastore").from("product_images").insert(
            images.map((img, i) => ({
              product_id: newProduct.id,
              storage_path: img.storage_path,
              url: img.url,
              sort_order: i,
            }))
          );
        }

        if (newProduct && isFeaturedOnHome) {
          const configResponse = await fetch("/api/home-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              featuredProductIds: [...initialFeaturedProductIds, newProduct.id],
              sectionOrder: initialSectionOrder,
            }),
          });

          if (!configResponse.ok) {
            const data = await configResponse.json().catch(() => null);
            throw new Error(
              data?.error || "Produto salvo, mas não foi possível atualizar o destaque da home."
            );
          }
        }
      }
      router.push(returnTo || "/admin/produtos");
      router.refresh();
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message)
            : String(err);
      alert(`Erro ao salvar: ${msg || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <Link
        href={returnTo || "/admin/produtos"}
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Categoria *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Preço em US$ (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex: 25.00 — vazio = sem preço (vai ao final)"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
          />
        </div>
        {hasSizes && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Tamanho
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
            >
              <option value="">Selecione (opcional)</option>
              {categorySizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Quantidade disponível
          </label>
          <input
            type="number"
            min={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="1 = cliente compra apenas 1 unidade"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
            title="Se 1, o cliente só pode comprar 1 unidade. Se maior, mostra seletor de quantidade."
          />
          <p className="mt-1 text-xs text-zinc-500">
            1 = um único item. Maior que 1 = cliente pode escolher quantidade.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          Link do produto na Shopify (opcional)
        </label>
        <input
          type="url"
          value={shopifyProductUrl}
          onChange={(e) => setShopifyProductUrl(e.target.value)}
          placeholder="https://sua-loja.myshopify.com/products/..."
          className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Se preenchido, na página do produto aparece o botão &quot;Comprar no Shopify&quot; e o cliente é redirecionado para o checkout na sua loja Shopify.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Fotos</label>
        <div className="mt-2 flex flex-wrap gap-4">
          {images.map((img, idx) => {
            const src = img.url || (img.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/favelastore_products/${img.storage_path}` : "");
            return (
              <div key={idx} className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src={src}
                    alt=""
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <label
            className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 text-zinc-400 transition hover:border-green-300 hover:text-green-500 ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Upload className="h-6 w-6" />
            <span className="mt-1 text-xs">{uploading ? "..." : "Upload"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-zinc-300"
        />
        <label htmlFor="active" className="text-sm text-zinc-700">
          Ativo (visível no catálogo)
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured-home"
          checked={isFeaturedOnHome}
          onChange={(e) => setIsFeaturedOnHome(e.target.checked)}
          className="rounded border-zinc-300"
        />
        <label htmlFor="featured-home" className="text-sm text-zinc-700">
          Produto em destaque na home
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <Link
          href="/admin/produtos"
          className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
