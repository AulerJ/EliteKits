import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOME_SECTION_ORDER,
  HOME_SECTION_IDS,
  type HomeSectionId,
} from "@/lib/supabase/queries";

const HOME_PAGE_CONFIG_KEY = "home_page_config";

function normalizeSectionOrder(value: unknown): HomeSectionId[] {
  const source = Array.isArray(value) ? value : DEFAULT_HOME_SECTION_ORDER;
  const filtered = source.filter(
    (item): item is HomeSectionId =>
      typeof item === "string" &&
      (HOME_SECTION_IDS as readonly string[]).includes(item)
  );

  const unique: HomeSectionId[] = [];
  for (const item of filtered) {
    if (!unique.includes(item)) {
      unique.push(item);
    }
  }

  for (const item of DEFAULT_HOME_SECTION_ORDER) {
    if (!unique.includes(item)) {
      unique.push(item);
    }
  }

  return unique;
}

export async function GET() {
  const supabase = createServiceRoleClient() ?? (await createClient());
  const { data } = await supabase
    .schema("favelastore")
    .from("site_settings")
    .select("value")
    .eq("key", HOME_PAGE_CONFIG_KEY)
    .maybeSingle();

  const raw = (data as { value?: string } | null)?.value;
  if (!raw?.trim()) {
    return NextResponse.json({
      featuredProductIds: [],
      sectionOrder: DEFAULT_HOME_SECTION_ORDER,
    });
  }

  try {
    const parsed = JSON.parse(raw) as
      | { featuredProductIds?: unknown; sectionOrder?: unknown; encomendaBannerUrl?: unknown }
      | null;

    const featuredProductIds = Array.isArray(parsed?.featuredProductIds)
      ? parsed.featuredProductIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0
        )
      : [];
    const encomendaBannerUrl =
      typeof parsed?.encomendaBannerUrl === "string" && parsed.encomendaBannerUrl.trim().length > 0
        ? parsed.encomendaBannerUrl.trim()
        : null;

    return NextResponse.json({
      featuredProductIds,
      sectionOrder: normalizeSectionOrder(parsed?.sectionOrder),
      encomendaBannerUrl,
    });
  } catch {
    return NextResponse.json({
      featuredProductIds: [],
      sectionOrder: DEFAULT_HOME_SECTION_ORDER,
      encomendaBannerUrl: null,
    });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Não autorizado. Faça login no admin." },
      { status: 401 }
    );
  }

  let body:
    | {
        featuredProductIds?: string[];
        sectionOrder?: HomeSectionId[];
        encomendaBannerUrl?: string | null;
      }
    | undefined;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const featuredProductIds = Array.isArray(body?.featuredProductIds)
    ? body.featuredProductIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0
      )
    : [];

  const sectionOrder = normalizeSectionOrder(body?.sectionOrder);
  const encomendaBannerUrl =
    body?.encomendaBannerUrl != null && typeof body.encomendaBannerUrl === "string" && body.encomendaBannerUrl.trim().length > 0
      ? body.encomendaBannerUrl.trim()
      : null;

  const value = JSON.stringify({
    featuredProductIds,
    sectionOrder,
    encomendaBannerUrl,
  });

  const supabase = createServiceRoleClient() ?? authClient;
  const { error } = await supabase
    .schema("favelastore")
    .from("site_settings")
    .upsert({ key: HOME_PAGE_CONFIG_KEY, value }, { onConflict: "key" });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Erro ao salvar." },
      { status: 500 }
    );
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
