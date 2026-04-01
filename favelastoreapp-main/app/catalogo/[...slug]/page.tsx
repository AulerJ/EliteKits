import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Folder, Shirt } from "lucide-react";
import {
  getCategoryShareData,
  getProductsByCategory,
} from "@/lib/supabase/queries";
import { CatalogProductGrid } from "@/components/CatalogProductGrid";
import { CatalogSearchProvider } from "@/components/CatalogSearchContext";
import { CategorySizeLinks } from "@/components/CategorySizeLinks";
import { CustomOrderCta } from "@/components/CustomOrderCta";
import { siteDisplayName } from "@/lib/site-brand";

/** Sempre buscar dados no servidor; evita cache estático com categoria/produtos vazios. */
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";

function getImageUrls(images: { url?: string | null; storage_path?: string }[] | null): string[] {
  if (!images?.length) return [];
  return images
    .map((img) => {
      if (img.url) return img.url;
      if (img.storage_path)
        return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
      return null;
    })
    .filter((u): u is string => !!u);
}

interface PageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ tamanho?: string; ordenar?: string; busca?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const brand = siteDisplayName();
  const { slug: segments } = await params;
  const category = await getCategoryShareData(segments);

  if (!category) {
    return {
      title: `Categoria | ${brand}`,
      description: `Confira esta categoria na ${brand}.`,
    };
  }

  const title = `${category.name} | ${brand}`;
  const description = `Confira os produtos da categoria ${category.name} na ${brand}.`;
  const pageUrl = `${siteUrl}/catalogo/${segments.join("/")}`;
  const rawImage = category.image || `${siteUrl}/logo.png`;
  const imageUrl = rawImage.startsWith("http")
    ? rawImage
    : `${siteUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: brand,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: category.name,
        },
      ],
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

function buildCategoryQuery(params: { tamanho?: string; ordenar?: string; busca?: string }) {
  const sp = new URLSearchParams();
  if (params.tamanho) sp.set("tamanho", params.tamanho);
  if (params.ordenar) sp.set("ordenar", params.ordenar);
  if (params.busca?.trim()) sp.set("busca", params.busca.trim());
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export default async function CategoriaPage({ params, searchParams }: PageProps) {
  const { slug: segments } = await params;
  const { tamanho, ordenar, busca } = await searchParams;
  
  // Validar ordenação: "preco", "data", ou padrão (sort_order)
  const orderBy = ordenar === "preco" ? "price" : ordenar === "data" ? "created_at" : "sort_order";

  const { category, products, sizes, children, siblings } = await getProductsByCategory(segments, tamanho, orderBy);

  if (!category) {
    return (
      <main className="min-h-screen">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-zinc-900">Categoria não encontrada</h1>
            <p className="mt-2 text-zinc-500">A categoria que você procura não existe ou foi removida.</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white transition hover:bg-green-500"
            >
              Voltar ao catálogo
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5511999999999";

  const basePath = `/catalogo/${segments.join("/")}`;
  const parentPath = segments.length > 1 ? `/catalogo/${segments.slice(0, -1).join("/")}` : null;
  const catName = (category?.name ?? "").toLowerCase();
  const catSlugs = segments.map((s) => s.toLowerCase());
  const isCamisas = catName.includes("camisa") || catSlugs.some((s) => s.includes("camisa"));
  // Cor por subcategoria: feminino(a) = rosa, infantil = azul claro, resto = âmbar
  function getSubcategoryTheme(name: string, slug: string) {
    const n = name.toLowerCase();
    const s = slug.toLowerCase();
    const isFem = n.includes("feminina") || n.includes("feminino") || s.includes("feminina") || s.includes("feminino");
    const isInf = n.includes("infantil") || n.includes("criança") || n.includes("crianca") || s.includes("infantil") || s.includes("crianca");
    if (isFem) return { icon: "text-pink-600", bg: "bg-pink-50", border: "hover:border-pink-300" };
    if (isInf) return { icon: "text-sky-600", bg: "bg-sky-50", border: "hover:border-sky-300" };
    return { icon: "text-amber-500", bg: "bg-amber-50/50", border: "hover:border-green-300" };
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
        <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Catálogo
          </Link>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
              <Link
                href={`/catalogo/${segments.slice(0, i + 1).join("/")}`}
                className={`rounded-lg px-3 py-2 capitalize transition ${
                  i === segments.length - 1
                    ? "font-medium text-green-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {seg.replace(/-/g, " ")}
              </Link>
            </span>
          ))}
        </nav>

        <h1 className="bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          {category.name}
        </h1>

        {siblings.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50 to-white px-3 py-2.5 shadow-sm">
            <span className="text-sm font-semibold text-zinc-500">Trocar:</span>
            {siblings.map((sib: { id: string; name: string; slug: string }) => {
              const sibPath = segments.slice(0, -1).concat(sib.slug).join("/");
              const isCurrent = segments[segments.length - 1] === sib.slug;
              const q = buildCategoryQuery({ ordenar, busca });
              const slugLow = sib.slug.toLowerCase();
              const nameLow = sib.name.toLowerCase();
              const isFeminina = slugLow === "feminina" || nameLow === "feminina";
              const isInfantil = slugLow === "infantil" || nameLow === "infantil";
              let btnClass: string;
              if (isFeminina) {
                btnClass = isCurrent
                  ? "bg-pink-600 text-white shadow-md ring-2 ring-pink-500/30"
                  : "bg-pink-100 text-pink-800 shadow-sm ring-1 ring-pink-200/60 hover:bg-pink-200 hover:ring-pink-300";
              } else if (isInfantil) {
                btnClass = isCurrent
                  ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-500/30"
                  : "bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200/60 hover:bg-sky-200 hover:ring-sky-300";
              } else {
                btnClass = isCurrent
                  ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/30"
                  : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200";
              }
              return (
                <Link
                  key={sib.id}
                  href={`/catalogo/${sibPath}${q}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${btnClass}`}
                >
                  {sib.name}
                </Link>
              );
            })}
          </div>
        )}

        {children.length > 0 && (
          <div className="mt-10">
            <p className="mb-4 text-base font-medium text-zinc-700">Subcategorias</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
              {children.map((child: { id: string; name: string; slug: string }) => {
                const theme = getSubcategoryTheme(child.name, child.slug);
                const iconClass =
                  theme.icon === "text-pink-600"
                    ? "h-8 w-8 text-pink-600"
                    : theme.icon === "text-sky-600"
                      ? "h-8 w-8 text-sky-600"
                      : "h-8 w-8 text-amber-500";
                const bgClass =
                  theme.bg === "bg-pink-50"
                    ? "bg-pink-50"
                    : theme.bg === "bg-sky-50"
                      ? "bg-sky-50"
                      : "bg-amber-50/50";
                const borderClass =
                  theme.border === "hover:border-pink-300"
                    ? "hover:border-pink-300"
                    : theme.border === "hover:border-sky-300"
                      ? "hover:border-sky-300"
                      : "hover:border-green-300";
                return (
                  <Link
                    key={child.id}
                    href={`${basePath}/${child.slug}`}
                    className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white py-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${borderClass}`}
                  >
                    <span className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${bgClass}`}>
                      {isCamisas ? (
                        <Shirt className={iconClass} />
                      ) : (
                        <Folder className={iconClass} />
                      )}
                    </span>
                    <span className="font-semibold text-zinc-800 group-hover:text-green-600">{child.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && !tamanho && children.length === 0 && siblings.length === 0 && (
          <div className="mt-10">
            <div className="rounded-2xl border border-green-200/60 bg-gradient-to-br from-green-500/10 via-white to-amber-500/5 p-8 shadow-sm sm:p-10">
              <p className="mb-2 text-center text-base font-medium uppercase tracking-wider text-green-700/90">
                Qual seu tamanho?
              </p>
              <p className="mb-8 text-center text-zinc-600">
                Toque no tamanho para ver as opções disponíveis
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
                {sizes.map((s) => (
                  <Link
                    key={s}
                    href={`${basePath}${buildCategoryQuery({ tamanho: s, ordenar, busca })}`}
                    className="group flex flex-col items-center justify-center rounded-2xl bg-white py-6 text-lg font-bold text-zinc-800 shadow-md ring-1 ring-zinc-200/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-green-400/50 hover:ring-2"
                  >
                    <span className="group-hover:text-green-600">{s}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <CatalogSearchProvider initialSearch={busca}>
          {sizes.length > 0 && tamanho && (
            <CategorySizeLinks basePath={basePath} parentPath={parentPath} sizes={sizes} currentTamanho={tamanho} />
          )}

          {(children.length === 0 || tamanho) && (
            <>
              {products.length > 0 && (
                <>
                  <CatalogProductGrid
                    products={products.map((p: { id: string; name: string; description: string | null; price: number | null; size: string | null; stock?: number | null; product_images: unknown[] }) => ({
                      id: p.id,
                      name: p.name,
                      description: p.description,
                      price: p.price,
                      size: p.size ?? null,
                      stock: p.stock ?? null,
                      imageUrls: getImageUrls(p.product_images as { url?: string | null; storage_path?: string }[]),
                    }))}
                    whatsappNumber={whatsappNumber}
                    initialSearch={busca}
                    totalCount={products.length}
                    countLabel={tamanho ? `no tamanho ${tamanho}` : undefined}
                  />
                  <CustomOrderCta whatsappNumber={whatsappNumber} variant="box" className="mt-10" />
                </>
              )}

              {products.length === 0 && (
                <div className="mt-12 space-y-6">
                  <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
                    <p className="text-zinc-600">
                      {tamanho ? `Nenhum produto no tamanho ${tamanho} no momento.` : "Nenhum produto nesta categoria."}
                    </p>
                    <Link href="/" className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white transition hover:bg-green-500">
                      Ver outras categorias
                    </Link>
                  </div>
                  <CustomOrderCta whatsappNumber={whatsappNumber} variant="box" />
                </div>
              )}
            </>
          )}
        </CatalogSearchProvider>

        {children.length > 0 && sizes.length === 0 && !tamanho && products.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">Clique em uma subcategoria acima para ver os produtos.</p>
        )}
      </section>
    </main>
  );
}
