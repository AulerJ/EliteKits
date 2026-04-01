import Link from "next/link";
import Image from "next/image";
import { Search, Package, Folder, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function productImageUrl(images: { url?: string | null; storage_path?: string }[] | null): string | null {
  const img = images?.[0];
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path) return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

export default async function AdminBuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim().toLowerCase();
  const supabase = await createClient();

  let products: Array<{
    id: string;
    name: string | null;
    price: number | null;
    size: string | null;
    is_active: boolean;
    category_name: string | null;
    imageUrl: string | null;
  }> = [];
  let categories: Array<{ id: string; name: string; slug: string; image_url: string | null }> = [];

  if (term.length >= 2) {
    const searchTerm = `%${term}%`;
    const { data: prodData } = await supabase
      .schema("favelastore")
      .from("products")
      .select("id, name, price, size, is_active, category_id, product_images(url, storage_path)")
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(30);

    const categoryIds = [...new Set((prodData ?? []).map((p: { category_id: string }) => p.category_id))];
    let categoryMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: catData } = await supabase
        .schema("favelastore")
        .from("categories")
        .select("id, name")
        .in("id", categoryIds);
      categoryMap = Object.fromEntries((catData ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
    }

    products = (prodData ?? []).map((p: Record<string, unknown>) => {
      const images = (p.product_images as { url?: string | null; storage_path?: string }[] | null) ?? null;
      return {
        id: p.id as string,
        name: (p.name as string) ?? null,
        price: p.price as number | null,
        size: (p.size as string) ?? null,
        is_active: (p.is_active as boolean) ?? true,
        category_name: categoryMap[p.category_id as string] ?? null,
        imageUrl: productImageUrl(images),
      };
    });

    const { data: catSearch } = await supabase
      .schema("favelastore")
      .from("categories")
      .select("id, name, slug, image_url")
      .ilike("name", searchTerm)
      .order("sort_order", { ascending: true })
      .limit(20);
    categories = (catSearch ?? []) as Array<{ id: string; name: string; slug: string; image_url: string | null }>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Buscar no admin</h1>
        <p className="mt-1 text-sm text-zinc-500">Produtos e pastas (categorias). Mínimo 2 caracteres.</p>
      </div>

      {term.length < 2 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-zinc-400" />
          <p className="mt-2 text-zinc-600">Digite na caixa de busca acima e pressione Enter.</p>
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-800">
                <Folder className="h-5 w-5 text-amber-600" />
                Pastas ({categories.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/admin/produtos?parent=${encodeURIComponent(cat.id)}`}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-green-300 hover:shadow"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {cat.image_url ? (
                        <Image
                          src={cat.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={cat.image_url.startsWith("http")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-amber-600">
                          <Folder className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-800 group-hover:text-green-700">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-800">
              <Package className="h-5 w-5 text-green-600" />
              Produtos ({products.length})
            </h2>
            {products.length === 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-zinc-500">
                Nenhum produto encontrado para &quot;{q}&quot;.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/produtos/${p.id}`}
                    className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-green-300 hover:shadow-md"
                  >
                    <div className="relative aspect-square bg-zinc-100">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name ?? ""}
                          fill
                          className="object-cover transition group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <Package className="h-12 w-12" />
                        </div>
                      )}
                      {!p.is_active && (
                        <span className="absolute right-2 top-2 rounded bg-zinc-700/90 px-2 py-0.5 text-xs text-white">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900">{p.name || "Sem nome"}</p>
                        {p.category_name && (
                          <p className="truncate text-xs text-zinc-500">{p.category_name}</p>
                        )}
                        {p.price != null && (
                          <p className="mt-0.5 text-sm font-semibold text-green-600">
                            US$ {Number(p.price).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Pencil className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-green-600" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
