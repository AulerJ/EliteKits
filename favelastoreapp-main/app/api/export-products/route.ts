import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function escapeCsv(s: string): string {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  const supabase = createServiceRoleClient() ?? authClient;
  const { data: rows } = await supabase
    .schema("favelastore")
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      size,
      categories(name, slug),
      product_images(url, storage_path)
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const lines: string[] = [];
  lines.push("id,name,description,price,size,category,image_url,product_url");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";

  for (const row of rows ?? []) {
    const r = row as {
      id: string;
      name?: string | null;
      description?: string | null;
      price?: number | null;
      size?: string | null;
      categories?: { name?: string; slug?: string } | null;
      product_images?: { url?: string | null; storage_path?: string }[] | null;
    };
    const imgs = r.product_images ?? [];
    const first = imgs[0];
    let imageUrl = first?.url ?? null;
    if (!imageUrl && first?.storage_path) {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/favelastore_products/${first.storage_path}`;
    }
    const cat = r.categories;
    const catName = cat?.name ?? "";
    const cells: string[] = [
      String(r.id),
      String(r.name ?? ""),
      String(r.description ?? ""),
      r.price != null ? String(r.price) : "",
      String(r.size ?? ""),
      String(catName),
      String(imageUrl ?? ""),
      `${siteUrl}/produto/${r.id}`,
    ];
    lines.push(cells.map(escapeCsv).join(","));
  }

  const csv = "\uFEFF" + lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=favela-store-produtos.csv",
    },
  });
}
