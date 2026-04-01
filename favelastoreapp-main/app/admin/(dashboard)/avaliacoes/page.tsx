import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AvaliacoesForm } from "./AvaliacoesForm";

export const dynamic = "force-dynamic";

const HOME_REVIEW_IMAGES_KEY = "home_review_images";

export default async function AvaliacoesAdminPage() {
  let images: string[] = [];

  try {
    const supabase = createServiceRoleClient() ?? (await createClient());
    if (supabase) {
      const { data } = await supabase
        .schema("favelastore")
        .from("site_settings")
        .select("value")
        .eq("key", HOME_REVIEW_IMAGES_KEY)
        .maybeSingle();

      const raw = (data as { value?: string } | null)?.value;
      if (raw?.trim()) {
        const parsed = JSON.parse(raw) as unknown;
        images = Array.isArray(parsed)
          ? parsed.filter(
              (url): url is string =>
                typeof url === "string" && url.trim().length > 0
            )
          : [];
      }
    }
  } catch {
    images = [];
  }

  return (
    <div>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
          <Images className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Avalia&ccedil;&otilde;es da home
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Adicione as fotos do carrossel que aparece logo abaixo dos produtos na p&aacute;gina inicial.
          </p>
        </div>
      </div>

      <AvaliacoesForm initialImages={images} />
    </div>
  );
}
