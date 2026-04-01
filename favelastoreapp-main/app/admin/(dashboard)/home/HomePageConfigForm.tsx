"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, Star, Trash2, Upload } from "lucide-react";
import { parseUploadResponse } from "@/lib/upload-response";
import type { HomePageConfig, HomeSectionId } from "@/lib/supabase/queries";

type ProductOption = {
  id: string;
  name: string;
  price: number | null;
  size: string | null;
  imageUrl: string | null;
  categoryName: string | null;
};

type HomePageConfigFormProps = {
  initialConfig: HomePageConfig;
  products: ProductOption[];
};

const SECTION_LABELS: Record<HomeSectionId, string> = {
  categories: "Categorias",
  "featured-products": "Produtos em destaque",
  "latest-products": "Adicionados recentemente",
  "encomenda-banner": "Banner encomendas",
  reviews: "Avaliações",
  instagram: "Instagram",
};

export function HomePageConfigForm({
  initialConfig,
  products,
}: HomePageConfigFormProps) {
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>(
    initialConfig.featuredProductIds
  );
  const [sectionOrder, setSectionOrder] = useState<HomeSectionId[]>(
    initialConfig.sectionOrder
  );
  const [encomendaBannerUrl, setEncomendaBannerUrl] = useState<string | null>(
    initialConfig.encomendaBannerUrl ?? null
  );
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const selectedProducts = featuredProductIds
    .map((id) => productMap.get(id))
    .filter((product): product is ProductOption => !!product);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selectedSet = new Set(featuredProductIds);

    return products.filter((product) => {
      if (selectedSet.has(product.id)) return false;
      if (!term) return true;

      return (
        product.name.toLowerCase().includes(term) ||
        (product.categoryName ?? "").toLowerCase().includes(term) ||
        (product.size ?? "").toLowerCase().includes(term)
      );
    });
  }, [featuredProductIds, products, search]);

  function moveSection(index: number, direction: "up" | "down") {
    setSectionOrder((current) => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function addFeaturedProduct(productId: string) {
    setFeaturedProductIds((current) =>
      current.includes(productId) ? current : [...current, productId]
    );
  }

  function removeFeaturedProduct(productId: string) {
    setFeaturedProductIds((current) => current.filter((id) => id !== productId));
  }

  function moveFeaturedProduct(index: number, direction: "up" | "down") {
    setFeaturedProductIds((current) => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "favelastore/home-encomenda");
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await parseUploadResponse(response);
      if (!response.ok) throw new Error(data.error || "Erro no envio");
      const url = data.url;
      if (typeof url === "string" && url.trim()) setEncomendaBannerUrl(url.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/home-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featuredProductIds,
          sectionOrder,
          encomendaBannerUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      alert("Configuração da home salva com sucesso.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-5xl space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">
          Ordem das seções da home
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Use as setas para escolher o que aparece antes ou depois na página
          inicial.
        </p>

        <ul className="mt-5 space-y-2">
          {sectionOrder.map((sectionId, index) => (
            <li
              key={sectionId}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-600">
                {index + 1}
              </span>
              <span className="font-medium text-zinc-800">
                {SECTION_LABELS[sectionId]}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white disabled:opacity-30"
                  aria-label="Subir seção"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sectionOrder.length - 1}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white disabled:opacity-30"
                  aria-label="Descer seção"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">
          Banner de encomendas
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Imagem que aparece na home (entre os blocos). Ao clicar, o cliente vai para o WhatsApp. Deixe em branco para não exibir.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-4">
          {encomendaBannerUrl && (
            <div className="relative">
              <div className="relative h-28 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                <Image
                  src={encomendaBannerUrl}
                  alt="Banner atual"
                  fill
                  className="object-cover"
                  unoptimized={encomendaBannerUrl.startsWith("http")}
                />
              </div>
              <button
                type="button"
                onClick={() => setEncomendaBannerUrl(null)}
                className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </div>
          )}
          <div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:border-green-400 hover:bg-green-50/50 disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              {uploadingBanner ? "Enviando..." : encomendaBannerUrl ? "Trocar imagem" : "Enviar imagem"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-zinc-900">
            Produtos em destaque
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Escolha os produtos que voc&ecirc; quer destacar na home e defina a
          ordem deles.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Buscar produto para destacar
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Digite nome, categoria ou tamanho..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addFeaturedProduct(product.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left transition hover:border-green-300 hover:bg-green-50/40"
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized={product.imageUrl.startsWith("http")}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {[product.categoryName, product.size]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {product.price != null && (
                      <p className="text-sm font-semibold text-green-600">
                        US$ {Number(product.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                    Adicionar
                  </span>
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                  Nenhum produto encontrado para adicionar.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-700">
              Ordem dos destaques
            </h3>
            <div className="mt-3 space-y-2">
              {selectedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                    {index + 1}
                  </span>
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized={product.imageUrl.startsWith("http")}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {[product.categoryName, product.size]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveFeaturedProduct(index, "up")}
                      disabled={index === 0}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                      aria-label="Subir produto"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFeaturedProduct(index, "down")}
                      disabled={index === selectedProducts.length - 1}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                      aria-label="Descer produto"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFeaturedProduct(product.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label="Remover destaque"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {selectedProducts.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                  Nenhum produto em destaque ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configurações da home"}
      </button>
    </div>
  );
}
