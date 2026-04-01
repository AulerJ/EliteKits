import Link from "next/link";
import { Plus, Folder, ChevronRight, Pencil, FileDown, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { NovaPastaButton } from "./NovaPastaButton";
import { FolderGridWithDelete } from "./FolderGridWithDelete";
import { ProductListWithSearch } from "./ProductListWithSearch";

interface PageProps {
  searchParams: Promise<{ parent?: string }>;
}

async function getBreadcrumb(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string | null
): Promise<{ id: string; name: string; slug: string }[]> {
  if (!categoryId) return [];
  const path: { id: string; name: string; slug: string }[] = [];
  let currentId: string | null = categoryId;
  while (currentId) {
    const res = await supabase
      .schema("favelastore")
      .from("categories")
      .select("id, name, slug, parent_id")
      .eq("id", currentId)
      .single();
    const data = res.data as { id: string; name: string; slug: string; parent_id: string | null } | null;
    if (!data) break;
    path.unshift({ id: data.id, name: data.name, slug: data.slug });
    currentId = data.parent_id;
  }
  return path;
}

export default async function ProdutosPage({ searchParams }: PageProps) {
  const { parent } = await searchParams;
  const supabase = await createClient();

  const breadcrumb = await getBreadcrumb(supabase, parent ?? null);

  const ROOT_EXCLUDE_SLUGS = ["camisas", "juliet"];
  const { data: rawChildCategories } = parent
    ? await supabase
        .schema("favelastore")
        .from("categories")
        .select("id, name, slug, sort_order, image_url, is_active")
        .eq("parent_id", parent)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
    : await supabase
        .schema("favelastore")
        .from("categories")
        .select("id, name, slug, sort_order, image_url, is_active")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
  const childCategories =
    parent || !rawChildCategories
      ? rawChildCategories ?? []
      : rawChildCategories.filter((c) => !ROOT_EXCLUDE_SLUGS.includes((c as { slug?: string }).slug ?? ""));

  const categoryIdForProducts = parent ?? null;
  let products: Array<Record<string, unknown>> = [];

  if (categoryIdForProducts) {
    const { data } = await supabase
      .schema("favelastore")
      .from("products")
      .select(
        `*,
        categories(name, slug, sort_order),
        product_images(url, storage_path)`
      )
      .eq("category_id", categoryIdForProducts)
      .order("sort_order", { ascending: true });
    products = (data as Array<Record<string, unknown>>) ?? [];
  }

  const addProductHref = parent
    ? `/admin/produtos/novo-em-lote?categoria_id=${encodeURIComponent(parent)}`
    : "/admin/produtos/novo-em-lote";

  const currentFolderName = breadcrumb[breadcrumb.length - 1]?.name;

  // Quando está numa pasta folha (ex: M), buscar irmãs (L, P, G...) para trocar rápido
  const parentCategoryId =
    parent && breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2]?.id : null;
  let siblingCategories: { id: string; name: string; sort_order: number }[] = [];
  if (parentCategoryId) {
    const { data: siblings } = await supabase
      .schema("favelastore")
      .from("categories")
      .select("id, name, sort_order")
      .eq("parent_id", parentCategoryId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    siblingCategories = (siblings as { id: string; name: string; sort_order: number }[]) ?? [];
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">
          {parent ? currentFolderName ?? "Pasta" : "Produtos"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <NovaPastaButton parentId={parent ?? null} />
          {parent && products.length > 0 && (
            <Link
              href={`/admin/produtos/editar-em-lote?parent=${encodeURIComponent(parent)}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <Pencil className="h-4 w-4" />
              Editar em lote
            </Link>
          )}
          <a
            href="/api/export-products"
            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 transition hover:bg-zinc-50"
            download
          >
            <FileDown className="h-4 w-4" />
            Exportar CSV
          </a>
          <Link
            href="/admin/produtos/ebay-sync"
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-medium text-amber-800 transition hover:bg-amber-100"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar com eBay
          </Link>
          <Link
            href="/admin/produtos/shopify-sync"
            className="flex items-center gap-2 rounded-lg border border-[#96bf48]/50 bg-[#96bf48]/10 px-4 py-2 font-medium text-[#5a7a2b] transition hover:bg-[#96bf48]/20"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar com Shopify
          </Link>
          <Link
            href={addProductHref}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-500"
          >
            <Plus className="h-4 w-4" />
            Adicionar produtos
          </Link>
        </div>
      </div>

      {/* Breadcrumb estilo Google Drive */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/produtos"
          className={`rounded-lg px-3 py-2 transition ${
            !parent ? "bg-green-100 font-medium text-green-800" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <Folder className="mr-1.5 inline h-4 w-4" />
          Raiz
        </Link>
        {breadcrumb.map((item, i) => (
          <span key={item.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <Link
              href={`/admin/produtos?parent=${encodeURIComponent(item.id)}`}
              className={`rounded-lg px-3 py-2 transition ${
                i === breadcrumb.length - 1
                  ? "bg-green-100 font-medium text-green-800"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Pastas (subcategorias) + Produtos */}
      <div className="space-y-6">
        {/* Pastas */}
        <FolderGridWithDelete
          folders={childCategories ?? []}
          parentId={parent ?? null}
        />

        {/* Trocar subpasta (ex: M → L) quando está numa pasta folha com irmãs */}
        {parent &&
          (childCategories?.length ?? 0) === 0 &&
          siblingCategories.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
              <span className="text-xs font-semibold text-zinc-500 sm:text-sm">
                Trocar subpasta
              </span>
              <div className="flex flex-wrap gap-1.5">
                {siblingCategories.map((sib) => (
                  <Link
                    key={sib.id}
                    href={`/admin/produtos?parent=${encodeURIComponent(sib.id)}`}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                      sib.id === parent
                        ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/30"
                        : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200 hover:bg-green-50 hover:text-green-700 hover:ring-green-200"
                    }`}
                  >
                    {sib.name}
                  </Link>
                ))}
                <Link
                  href={`/admin/produtos?parent=${encodeURIComponent(parentCategoryId!)}`}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300"
                >
                  ↩ Pasta acima
                </Link>
              </div>
            </div>
          )}

        {/* Produtos - só mostra quando está numa pasta SEM subpastas (folha) */}
        {parent && (childCategories?.length ?? 0) === 0 && (
          <ProductListWithSearch
            products={products as any}
            folderName={currentFolderName ?? "Pasta"}
            addProductHref={addProductHref}
            returnTo={parent ? `/admin/produtos?parent=${encodeURIComponent(parent)}` : undefined}
          />
        )}

        {/* Se a pasta tem subpastas (ex: Camisa → tamanhos), não mistura produtos aqui */}
        {parent && (childCategories?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Clique em um tamanho acima (S, M, L, etc.) para ver/adicionar produtos.
          </div>
        )}

        {/* Na raiz: aviso se não tem pastas */}
        {!parent && (childCategories?.length ?? 0) === 0 && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-zinc-500">Nenhuma pasta criada ainda.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Crie uma pasta (ex: Camisa, Óculos) ou subpasta (ex: Camisa → Tamanho P, Tamanho M).
            </p>
            <NovaPastaButton parentId={null} className="mt-4" />
          </div>
        )}
      </div>
    </div>
  );
}
