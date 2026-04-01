import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const HERO_IMAGES_KEY = "hero_images";

export async function GET() {
  const supabase = createServiceRoleClient() ?? (await createClient());
  const { data } = await supabase
    .schema("favelastore")
    .from("site_settings")
    .select("value")
    .eq("key", HERO_IMAGES_KEY)
    .maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  if (!raw?.trim()) return NextResponse.json({ images: [] });
  try {
    const parsed = JSON.parse(raw) as unknown;
    const images = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0) : [];
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  let body: { images?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images.filter((u): u is string => typeof u === "string" && u.trim().length > 0) : [];
  const value = JSON.stringify(images);

  const supabase = createServiceRoleClient() ?? authClient;
  const { error } = await supabase
    .schema("favelastore")
    .from("site_settings")
    .upsert({ key: HERO_IMAGES_KEY, value }, { onConflict: "key" });

  if (error) {
    console.error("Hero save error:", error);
    return NextResponse.json({ error: error.message || "Erro ao salvar." }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
