import { createClient } from "@/lib/supabase/server";
import { getSearchProducts, type SearchProduct } from "@/lib/supabase/queries";
import { CustomOrderCta } from "@/components/CustomOrderCta";
import { BuscaResults } from "./BuscaResults";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export const dynamic = "force-dynamic";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tamanho?: string }>;
}) {
  const { q, tamanho } = await searchParams;
  const term = (q ?? "").trim();
  const tamanhoFilter = (tamanho ?? "").trim() || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin =
    !!user &&
    (!ADMIN_EMAIL || (user.email && user.email === ADMIN_EMAIL));

  const allProducts: SearchProduct[] =
    term.length >= 2 ? await getSearchProducts(term) : [];

  const SIZE_ORDER = ["pp", "p", "xs", "s", "small", "m", "l", "xl", "xxl", "xxxl", "xxxxl", "feminina", "infantil"];

  const isCamisaProduct = (p: SearchProduct) => {
    const cat = (p.categoryName ?? "").toLowerCase();
    const size = (p.size ?? "").trim().toLowerCase();
    return cat.includes("camisa") || SIZE_ORDER.includes(size);
  };

  const camisaProducts = allProducts.filter(isCamisaProduct);
  const outrosProducts = allProducts.filter((p) => !isCamisaProduct(p));

  const sizes = (() => {
    const set = new Set<string>();
    const norm = (v: string) => (v.toLowerCase() === "small" ? "S" : v);
    for (const p of allProducts) {
      const size = (p.size ?? "").trim();
      const cat = (p.categoryName ?? "").trim();
      const label = size || cat;
      if (!label) continue;
      const low = label.toLowerCase();
      if (SIZE_ORDER.includes(low)) set.add(norm(label));
    }
    // Para camisas, garantir que Feminina/Infantil apareçam se existirem no resultado
    if (camisaProducts.length > 0) {
      set.add("Feminina");
      set.add("Infantil");
    }
    const orderIndex = (value: string) => {
      const low = value.toLowerCase();
      const idx = SIZE_ORDER.indexOf(low);
      return idx === -1 ? SIZE_ORDER.length : idx;
    };
    return Array.from(set).sort((a, b) => {
      const ia = orderIndex(a);
      const ib = orderIndex(b);
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  })();

  const FILTER_OUTROS = "outros";
  const tamanhoNorm = (tamanhoFilter ?? "").trim().toLowerCase();
  const isOutrosFilter = tamanhoNorm === FILTER_OUTROS;

  const camisaFiltered =
    isOutrosFilter
      ? []
      : tamanhoNorm && sizes.some((s) => s.toLowerCase() === tamanhoNorm)
        ? camisaProducts.filter((p) => {
            const pSize = (p.size ?? "").trim().toLowerCase();
            const pCat = (p.categoryName ?? "").trim().toLowerCase();
            const pLabel = pSize || pCat;
            if (tamanhoNorm === "s") return pLabel === "s" || pLabel === "small";
            return pLabel === tamanhoNorm;
          })
        : camisaProducts;

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5511999999999";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
        {term.length >= 2
          ? `Resultados para "${term}"`
          : "Buscar produtos"}
      </h1>
      {term.length < 2 && (
        <p className="mt-2 text-sm text-zinc-600">
          Use o campo de busca na página inicial e pressione Enter para ver todos os resultados aqui.
        </p>
      )}
      <BuscaResults
        camisaProducts={camisaFiltered}
        outrosProducts={outrosProducts}
        allProducts={allProducts}
        isAdmin={!!isAdmin}
        searchTerm={term}
        whatsappNumber={whatsappNumber}
        sizes={sizes}
        currentTamanho={tamanhoFilter}
        hasCamisaResults={camisaProducts.length > 0}
      />
      {term.length >= 2 && (
        <CustomOrderCta whatsappNumber={whatsappNumber} variant="box" className="mt-10" />
      )}
    </main>
  );
}
