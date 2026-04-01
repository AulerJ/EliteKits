import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProdutoForm } from "../ProdutoForm";
import { getHomePageConfig } from "@/lib/supabase/queries";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}

export default async function EditarProdutoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { return: returnTo } = await searchParams;
  const [supabase, homeConfig] = await Promise.all([
    createClient(),
    getHomePageConfig(),
  ]);

  const { data: produto } = await supabase
    .schema("favelastore")
    .from("products")
    .select(`
      *,
      product_images(*)
    `)
    .eq("id", id)
    .single();

  const { data: allCats } = await supabase
    .schema("favelastore")
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order");
  type CatRow = { id: string; name: string; slug: string; parent_id: string | null };
  const catList: CatRow[] = allCats ?? [];
  const byId = new Map(catList.map((c) => [c.id, c]));
  const categories = catList.map((c) => {
    const pathParts: string[] = [];
    let curr: CatRow | undefined = c;
    while (curr) {
      pathParts.unshift(curr.name);
      curr = curr.parent_id ? byId.get(curr.parent_id) : undefined;
    }
    return { id: c.id, name: pathParts.join(" › "), slug: c.slug };
  }).sort((a, b) => a.name.localeCompare(b.name));

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

  if (!produto) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Editar produto</h1>
      <ProdutoForm
        produto={produto}
        categories={categories ?? []}
        sizesByCategory={sizesByCategory}
        initialFeaturedProductIds={homeConfig.featuredProductIds}
        initialSectionOrder={homeConfig.sectionOrder}
        returnTo={returnTo || undefined}
      />
    </div>
  );
}
