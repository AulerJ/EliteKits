"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { STORE_SLUG_ELITE_KITS } from "@/lib/store";

export async function saveEliteKitsStoreListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Não autorizado");
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    throw new Error("Produto inválido");
  }

  const visible = formData.get("visible") === "on";
  const priceRaw = String(formData.get("priceOverride") ?? "").trim();
  let priceOverride: number | null = null;
  if (priceRaw !== "") {
    const n = parseFloat(priceRaw.replace(",", "."));
    if (!Number.isNaN(n) && n >= 0) {
      priceOverride = n;
    }
  }

  // Service role evita falhas de RLS/sessão no upsert; ainda exige usuário logado acima.
  const db = createServiceRoleClient() ?? supabase;
  const { error } = await db
    .schema("favelastore")
    .from("product_store_listings")
    .upsert(
      {
        product_id: productId,
        store_slug: STORE_SLUG_ELITE_KITS,
        visible,
        price_override: priceOverride,
      },
      { onConflict: "product_id,store_slug" }
    );

  if (error) {
    throw new Error(error.message);
  }

  // Next.js 16 pode lançar em revalidatePath com tipo "layout"/"page" em rotas dinâmicas — não quebrar o save.
  try {
    revalidatePath("/admin/elite-kits");
    revalidatePath("/", "layout");
    revalidatePath("/catalogo");
    revalidatePath("/busca");
    revalidatePath("/produto");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[saveEliteKitsStoreListing] revalidatePath:", e);
  }
}
