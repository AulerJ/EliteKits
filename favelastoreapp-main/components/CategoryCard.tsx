import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

interface CategoryCardProps {
  name: string;
  slug: string;
  image: string;
  icon?: unknown;
}

export function CategoryCard({ name, slug, image }: CategoryCardProps) {
  const ac = publicStorefrontAccent();
  return (
    <Link
      href={`/catalogo/${slug}`}
      className={`group block overflow-hidden rounded-[1.2rem] border border-zinc-200/80 bg-white shadow-[0_12px_35px_-20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 ${ac.categoryCardBorder} hover:shadow-xl`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-200">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 39vw, (max-width: 1024px) 31vw, 19vw"
          unoptimized={image.startsWith("http")}
          draggable={false}
        />
      </div>

      <div className="px-3 py-3">
        <span className="block text-center text-sm font-bold uppercase tracking-wide text-zinc-900 sm:text-base">
          {name}
        </span>
        <span className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-zinc-500 sm:text-sm">
          Ver mais{" "}
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
