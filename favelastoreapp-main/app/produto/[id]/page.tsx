import Link from "next/link";
import Image from "next/image";
import { getProductById, getOtherProductsInCategory, getCategorySlugPath } from "@/lib/supabase/queries";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BackToPrevious } from "@/components/BackToPrevious";
import { ProductPageNav } from "@/components/ProductPageNav";
import { ProductPageNavSync } from "@/components/ProductPageNavSync";
import { ProductSwipeNav } from "@/components/ProductSwipeNav";
import { ShareProductButton } from "@/components/ShareProductButton";
import { CustomOrderCta } from "@/components/CustomOrderCta";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import type { Metadata } from "next";
import { siteDisplayName } from "@/lib/site-brand";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const brand = siteDisplayName();
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return { title: `Produto | ${brand}` };
  }
  const hasName = product.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(product.name);
  const title = hasName ? `${product.name!.trim()} | ${brand}` : brand;
  const desc = product.description || `Confira na ${brand}.`;
  const rawImage = product.imageUrl || `${siteUrl}/logo.png`;
  const imageUrl = rawImage.startsWith("http") ? rawImage : `${siteUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${siteUrl}/produto/${id}`,
      siteName: brand,
      images: [{ url: imageUrl, width: 800, height: 800, alt: hasName ? product.name!.trim() : brand }],
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [imageUrl],
    },
  };
}

export default async function ProdutoPage({ params }: PageProps) {
  const ac = publicStorefrontAccent();
  const { id } = await params;
  const product = await getProductById(id);
  const [otherInCategory, categorySlugPath] =
    product?.categoryId != null
      ? await Promise.all([
          getOtherProductsInCategory(product.categoryId, id, 12),
          getCategorySlugPath(product.categoryId),
        ])
      : [[], []];
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5511999999999";

  if (!product) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Produto não encontrado</h1>
          <Link href="/" className={`mt-6 inline-block ${ac.btnSolidRounded}`}>
            Ver catálogo
          </Link>
        </div>
      </main>
    );
  }

  const hasName = product.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(product.name);
  const productUrl = `${siteUrl}/produto/${id}`;
  const whatsappText = hasName
    ? `Olá! Tenho interesse no produto: ${product.name!.trim()} - ${productUrl}`
    : `Olá! Tenho interesse neste produto: ${productUrl}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <BackToPrevious
            categoryName={product.categoryName}
            categoryHref={categorySlugPath.length > 0 ? `/catalogo/${categorySlugPath.join("/")}` : null}
          />
          <ShareProductButton url={productUrl} />
        </div>
        <ProductPageNav
          productId={id}
          categoryName={product.categoryName}
          categoryHref={categorySlugPath.length > 0 ? `/catalogo/${categorySlugPath.join("/")}` : null}
        />
        {otherInCategory.length > 0 && (
          <ProductPageNavSync productId={id} otherIds={otherInCategory.map((p) => p.id)} />
        )}
        <ProductSwipeNav productId={id}>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-200">
          <ProductImageGallery
            imageUrls={product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []}
            alt={product.name?.trim() || ""}
          />
          <div className="p-6">
            {product.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(product.name) && (
              <h1 className="text-xl font-bold text-zinc-900">{product.name.trim()}</h1>
            )}
            {(product.stock ?? 1) > 1 && (
              <p className="mt-0.5 text-sm font-medium text-zinc-600">
                {(product.stock ?? 1)} unidades disponíveis
              </p>
            )}
            <p className="mt-1 text-sm font-semibold text-zinc-700">
              Tamanho: {product.size ?? "—"}
            </p>
            {product.description && (
              <p className="mt-2 text-zinc-600">{product.description}</p>
            )}
            {product.price != null && (
              <p className={`mt-3 ${ac.priceLg}`}>US$ {Number(product.price).toFixed(2)}</p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              {product.shopifyProductUrl && (
                <a
                  href={product.shopifyProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#96bf48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7da53e] min-w-0"
                >
                  Comprar no Shopify
                </a>
              )}
              <AddToCartButton
                productId={product.id}
                name={product.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(product.name) ? product.name.trim() : null}
                price={product.price}
                imageUrl={product.imageUrl}
                size={product.size ?? null}
                stock={product.stock ?? null}
              />
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366] hover:text-white"
                aria-label="Falar com vendedor"
                title="Falar com vendedor"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
        </ProductSwipeNav>

        {otherInCategory.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">
              {product.categoryName
                ? `Você também pode gostar de outros itens em ${product.categoryName}`
                : "Outras opções nesta categoria"}
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:-mx-0 sm:px-0">
              {otherInCategory.map((p) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.id}`}
                  className={`flex w-36 flex-shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-zinc-200/60 transition ${ac.ringCard}`}
                >
                  <div className="relative aspect-square bg-zinc-100">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name?.trim() || ""}
                        fill
                        className="object-cover"
                        sizes="144px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    {p.name?.trim() && !p.name.match(/^produto\s*-?\s*\d+$/i) && (
                      <p className="line-clamp-2 text-xs font-medium text-zinc-900">{p.name.trim()}</p>
                    )}
                    {(p.stock ?? 1) > 1 && (
                      <p className="mt-0.5 text-[10px] font-medium text-zinc-600">{(p.stock ?? 1)} unidades</p>
                    )}
                    {p.price != null && (
                      <p className={ac.priceSmBold}>
                        US$ {Number(p.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {categorySlugPath.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Link
                  href={`/catalogo/${categorySlugPath.join("/")}`}
                  className={ac.outlineBtn}
                >
                  Ver todos em {product.categoryName ?? "esta categoria"}
                </Link>
              </div>
            )}
          </section>
        )}

        <CustomOrderCta whatsappNumber={whatsappNumber} variant="box" className="mt-12" />
      </div>
    </main>
  );
}
