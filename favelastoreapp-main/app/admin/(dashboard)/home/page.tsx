import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHomePageConfig } from "@/lib/supabase/queries";
import { HomePageConfigForm } from "./HomePageConfigForm";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function getImageUrl(
  images: { url?: string | null; storage_path?: string }[] | null
) {
  const image = images?.[0];
  if (!image) return null;
  if (image.url) return image.url;
  if (image.storage_path) {
    return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${image.storage_path}`;
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function HomeAdminPage() {
  const [supabase, initialConfig] = await Promise.all([
    createClient(),
    getHomePageConfig(),
  ]);

  const { data } = await supabase
    .schema("favelastore")
    .from("products")
    .select(
      "id, name, price, size, is_active, categories(name), product_images(url, storage_path)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const products = (data ?? []).map((product: any) => ({
    id: product.id as string,
    name:
      typeof product.name === "string" && product.name.trim().length > 0
        ? product.name
        : `Produto ${product.id}`,
    price: (product.price as number | null | undefined) ?? null,
    size: (product.size as string | null | undefined) ?? null,
    imageUrl: getImageUrl(
      (product.product_images as
        | { url?: string | null; storage_path?: string }[]
        | null) ?? null
    ),
    categoryName:
      (product.categories?.name as string | null | undefined) ?? null,
  }));

  return (
    <div>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <Home className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Configurar home
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Escolha os produtos em destaque e a ordem dos blocos da
            p&aacute;gina inicial.
          </p>
        </div>
      </div>

      <HomePageConfigForm
        initialConfig={initialConfig}
        products={products}
      />
    </div>
  );
}
