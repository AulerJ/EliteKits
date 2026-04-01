import Link from "next/link";
import { ImageIcon, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CategoriaFotoEditor } from "./CategoriaFotoEditor";

export default async function CategoriasFotoPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .schema("favelastore")
    .from("categories")
    .select("id, name, slug, image_url")
    .is("parent_id", null)
    .order("sort_order", { ascending: true });
  const excludeSlugs = ["camisas", "juliet"];
  const categories = (raw ?? []).filter((c) => !excludeSlugs.includes(c.slug));

  return (
    <div>
      <Link
        href="/admin/produtos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">Fotos das categorias</h1>
      <p className="mt-2 text-zinc-600">
        Altere a foto que seus clientes veem no catálogo. Clique em uma categoria para trocar.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {(categories ?? []).map((cat) => (
          <CategoriaFotoEditor
            key={cat.id}
            categoryId={cat.id}
            name={cat.name}
            slug={cat.slug}
            currentImageUrl={(cat as { image_url?: string | null }).image_url ?? null}
          />
        ))}
      </div>
    </div>
  );
}
