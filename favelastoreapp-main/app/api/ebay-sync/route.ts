import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { syncProductsToEbay } from "@/lib/ebay/sync";
import { hasEbayConfig } from "@/lib/ebay/config";

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  const supabase = createServiceRoleClient() ?? authClient;

  const { data: catRows } = await supabase
    .schema("favelastore")
    .from("categories")
    .select("id, name, parent_id");

  const categoriesById = new Map<string | null, { name: string; parentId: string | null }>();
  for (const c of catRows ?? []) {
    const row = c as { id: string; name?: string; parent_id?: string | null };
    categoriesById.set(row.id, { name: row.name ?? "", parentId: row.parent_id ?? null });
  }

  const { data: rows } = await supabase
    .schema("favelastore")
    .from("products")
    .select("id, name, price, category_id, categories(id, name)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const products = (rows ?? []).map((r: Record<string, unknown>) => {
    const cat = r.categories;
    const catObj = Array.isArray(cat) ? (cat[0] as { id?: string; name?: string } | undefined) : (cat as { id?: string; name?: string } | null);
    const categoryId = (r.category_id as string) ?? (catObj?.id ?? "");
    const categoryName = catObj?.name ?? "";
    const parentId = categoryId ? (categoriesById.get(categoryId)?.parentId ?? null) : null;
    const parentName = parentId ? (categoriesById.get(parentId)?.name ?? "") : "";
    return {
      id: r.id,
      name: r.name ?? "",
      price: r.price ?? 0,
      subcategoryId: categoryId,
      subcategoryName: categoryName,
      parentCategoryId: parentId ?? categoryId,
      parentCategoryName: parentName || categoryName,
    };
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  if (!hasEbayConfig()) {
    return NextResponse.json(
      { ok: false, message: "eBay não configurado. Adicione EBAY_CLIENT_ID, EBAY_CLIENT_SECRET e EBAY_REFRESH_TOKEN no .env. Veja docs/EBAY_SYNC.md." },
      { status: 400 }
    );
  }

  let body: { productIds?: string[]; priceIncreaseAmount?: number; priceOverrides?: Record<string, number> } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabase = createServiceRoleClient() ?? authClient;
  let query = supabase
    .schema("favelastore")
    .from("products")
    .select("id, name, description, price, size, product_images(url, storage_path)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (body.productIds?.length) {
    query = query.in("id", body.productIds);
  }

  const { data: rows } = await query;

  const products = (rows ?? []) as Parameters<typeof syncProductsToEbay>[0];
  const result = await syncProductsToEbay(products, {
    priceIncreaseAmount: body.priceIncreaseAmount,
    priceOverrides: body.priceOverrides,
  });

  return NextResponse.json(result);
}
