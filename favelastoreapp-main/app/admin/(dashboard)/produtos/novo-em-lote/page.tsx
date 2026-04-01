import { createClient } from "@/lib/supabase/server";
import { BulkAddForm } from "../BulkAddForm";

interface CategoryWithPath {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  path: string;
}

async function getAllCategoriesWithPath(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CategoryWithPath[]> {
  const { data: all } = await supabase
    .schema("favelastore")
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order", { ascending: true });
  if (!all?.length) return [];

  const byId = new Map(all.map((c) => [c.id, c]));
  const result: CategoryWithPath[] = [];
  for (const c of all) {
    const pathParts: string[] = [];
    let curr: (typeof all)[0] | undefined = c;
    while (curr) {
      pathParts.unshift(curr.name);
      curr = curr.parent_id ? byId.get(curr.parent_id) : undefined;
    }
    result.push({ ...c, path: pathParts.join(" › ") });
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

interface PageProps {
  searchParams: Promise<{ categoria_id?: string; categoria?: string; tamanho?: string }>;
}

export default async function NovoEmLotePage({ searchParams }: PageProps) {
  const { categoria_id: categoriaId, categoria: catSlug, tamanho } = await searchParams;
  const supabase = await createClient();
  const categoriesWithPath = await getAllCategoriesWithPath(supabase);

  const categories = categoriesWithPath.map((c) => ({ id: c.id, name: c.path, slug: c.slug }));

  const initialCat = categoriaId
    ? categoriesWithPath.find((c) => c.id === categoriaId)
    : catSlug
      ? categoriesWithPath.find((c) => c.slug === catSlug)
      : null;

  // "Também adicionar" só mostra categorias irmãs (ex.: outros tamanhos da mesma camisa)
  const alsoCategoryOptions =
    initialCat?.parent_id != null
      ? categoriesWithPath
          .filter((c) => c.parent_id === initialCat.parent_id && c.id !== initialCat.id)
          .map((c) => ({ id: c.id, name: c.path, slug: c.slug }))
      : [];

  const { data: sizeRows } = await supabase
    .schema("favelastore")
    .from("category_sizes")
    .select("category_id, name")
    .order("sort_order", { ascending: true });

  const sizesByCategory: Record<string, string[]> = {};
  for (const r of sizeRows ?? []) {
    if (!sizesByCategory[r.category_id]) sizesByCategory[r.category_id] = [];
    sizesByCategory[r.category_id].push(r.name);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Adicionar produtos</h1>
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">Importar do Google Drive:</p>
          <p className="mt-1 text-sm text-green-700">
            Você pode arrastar ou selecionar várias fotos de uma vez. O sistema detecta automaticamente o tipo de imagem mesmo se baixar do Google Drive sem extensão ou com tipo &quot;file&quot;.
          </p>
          <p className="mt-2 text-xs text-green-600">
            💡 <strong>Dica:</strong> No Google Drive, selecione as fotos → botão direito → &quot;Download&quot;. Ou arraste direto da pasta do computador para a área abaixo.
          </p>
        </div>
      </div>
      <BulkAddForm
        categories={categories}
        sizesByCategory={sizesByCategory}
        initialCategoryId={initialCat?.id}
        initialCategorySlug={!categoriaId && catSlug ? catSlug : undefined}
        initialTamanho={tamanho}
        alsoCategoryOptions={alsoCategoryOptions}
      />
    </div>
  );
}
