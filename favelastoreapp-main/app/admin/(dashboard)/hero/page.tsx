import Link from "next/link";
import { ArrowLeft, Layout } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HeroForm } from "./HeroForm";

export const dynamic = "force-dynamic";

const HERO_IMAGES_KEY = "hero_images";

export default async function HeroAdminPage() {
  let images: string[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .schema("favelastore")
      .from("site_settings")
      .select("value")
      .eq("key", HERO_IMAGES_KEY)
      .maybeSingle();
    const raw = (data as { value?: string } | null)?.value;
    if (raw?.trim()) {
      const parsed = JSON.parse(raw) as unknown;
      images = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0) : [];
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
      <h1 className="text-2xl font-bold text-zinc-900">Hero da página inicial</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Adicione imagens para o topo da home. Uma imagem = estática. Várias = carrossel que troca sozinho a cada 5 segundos. Use as setas para reordenar.
      </p>
      <HeroForm initialImages={images} />
    </div>
  );
}
