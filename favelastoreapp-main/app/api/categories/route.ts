import { NextResponse } from "next/server";
import { getCategoriesTree } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tree = await getCategoriesTree();
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
