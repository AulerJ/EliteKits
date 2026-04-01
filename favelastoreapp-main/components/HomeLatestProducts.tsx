import Image from "next/image";
import Link from "next/link";
import type { HomeProductCard } from "@/lib/supabase/queries";

type HomeLatestProductsProps = {
  products: HomeProductCard[];
  title?: string;
  description?: string;
};

function formatPrice(price: number | null) {
  if (price == null) return null;
  return `US$ ${Number(price).toFixed(2)}`;
}

export function HomeLatestProducts({
  products,
  title = "Adicionados recentemente",
  description = "Veja os produtos mais novos que chegaram na loja",
}: HomeLatestProductsProps) {
  if (!products.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-zinc-600">
            {description}
          </p>
        </div>
        <Link
          href="/catalogo"
          className="hidden rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-green-500 sm:inline-flex"
        >
          Ver todos os produtos
        </Link>
      </div>

      <div
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "auto" }}
      >
        {products.map((product, index) => {
          const title =
            product.name?.trim() && !/^produto\s*-?\s*\d+$/i.test(product.name)
              ? product.name.trim()
              : "Produto";

          return (
            <Link
              key={product.id}
              href={`/produto/${product.id}`}
              className="group w-[46vw] min-w-[168px] flex-none overflow-hidden rounded-xl border border-zinc-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-1 hover:ring-green-300/50 sm:w-[250px] sm:min-w-[250px] lg:w-[270px] lg:min-w-[270px]"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={title}
                    width={500}
                    height={500}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 50vw, 25vw"
                    loading={index < 2 ? "eager" : "lazy"}
                    unoptimized={product.imageUrl.startsWith("http")}
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-400">
                    Sem foto
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-zinc-900 sm:text-base">
                  {title}
                </h3>
                {(product.stock ?? 1) > 1 && (
                  <p className="mt-0.5 text-xs font-medium text-zinc-600">{(product.stock ?? 1)} unidades</p>
                )}
                {product.size && (
                  <p className="mt-1 text-xs font-medium text-zinc-500 sm:text-sm">
                    Tamanho: {product.size}
                  </p>
                )}
                {formatPrice(product.price) && (
                  <p className="mt-2 text-base font-bold text-green-600 sm:text-lg">
                    {formatPrice(product.price)}
                  </p>
                )}
                <span className="mt-2 inline-flex text-xs font-semibold text-zinc-700 transition group-hover:text-green-600">
                  Ver produto
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center sm:hidden">
        <Link
          href="/catalogo"
          className="inline-flex rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-500"
        >
          Ver todos os produtos
        </Link>
      </div>
    </section>
  );
}
