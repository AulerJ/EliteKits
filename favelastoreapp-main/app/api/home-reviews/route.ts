import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createPublicClient, createServiceRoleClient } from "@/lib/supabase/server";

const HOME_REVIEW_IMAGES_KEY = "home_review_images";

/** Lê as fotos com o mesmo cliente que a home usa (anon = SELECT permitido). Assim a lista sempre carrega em dev e produção. */
export async function GET() {
  const supabase =
    createPublicClient() ?? createServiceRoleClient() ?? (await createClient());
  if (!supabase) return NextResponse.json({ images: [], error: "no_client" });

  const { data, error } = await supabase
    .schema("favelastore")
    .from("site_settings")
    .select("value")
    .eq("key", HOME_REVIEW_IMAGES_KEY)
    .maybeSingle();

  if (error) {
    if (error.code === "42501" || error.message?.toLowerCase().includes("permission denied")) {
      return NextResponse.json({
        images: [],
        error: "permission_denied",
        message:
          "Adicione SUPABASE_SERVICE_ROLE_KEY no .env.local ou rode o SQL em supabase/scripts/fix-site-settings-permissions.sql no Supabase (SQL Editor).",
      });
    }
    return NextResponse.json({ images: [], error: error.message });
  }

  const raw = (data as { value?: string } | null)?.value;
  if (!raw?.trim()) return NextResponse.json({ images: [] });

  try {
    const parsed = JSON.parse(raw) as unknown;
    const images = Array.isArray(parsed)
      ? parsed.filter(
          (url): url is string =>
            typeof url === "string" && url.trim().length > 0
        )
      : [];
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "N\u00e3o autorizado. Fa\u00e7a login no admin." },
      { status: 401 }
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        error:
          "Para salvar o carrossel, adicione a chave service_role no .env.local: Supabase → Settings → API → Project API keys → service_role (copie) e crie a variável SUPABASE_SERVICE_ROLE_KEY=eyJ... Depois reinicie o servidor (npm run dev).",
      },
      { status: 503 }
    );
  }

  let body: { images?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inv\u00e1lido" }, { status: 400 });
  }

  const images = Array.isArray(body.images)
    ? body.images.filter(
        (url): url is string =>
          typeof url === "string" && url.trim().length > 0
      )
    : [];

  const value = JSON.stringify(images);

  const { error } = await supabaseAdmin
    .schema("favelastore")
    .from("site_settings")
    .upsert({ key: HOME_REVIEW_IMAGES_KEY, value }, { onConflict: "key" });

  if (error) {
    if (error.code === "42501" || error.message?.toLowerCase().includes("permission denied")) {
      return NextResponse.json(
        {
          error:
            "Permissão negada no Supabase. Adicione SUPABASE_SERVICE_ROLE_KEY no .env.local (Supabase → Settings → API → service_role). Reinicie o servidor.",
        },
        { status: 403 }
      );
    }
    console.error("Home reviews save error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao salvar." },
      { status: 500 }
    );
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
