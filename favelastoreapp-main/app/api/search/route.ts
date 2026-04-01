import { NextRequest, NextResponse } from "next/server";
import { getSearchProducts } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await getSearchProducts(q);
    return NextResponse.json(
      results.slice(0, 30).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        size: p.size,
      }))
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
