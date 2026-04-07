import { createPublicClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPublicStoreSlug, STORE_SLUG_ELITE_KITS } from "@/lib/store";
import {
  fetchVisibleListingPriceMap,
  type ListingFetchError,
} from "@/lib/store-listings";

/** Mesmo cliente usado no catálogo público (`queries.catalogSupabaseForListings`). */
function catalogClientLikePublicSite() {
  return createServiceRoleClient() ?? createPublicClient();
}

export type EliteKitsCatalogDiagnostics = {
  /** Valor de `NEXT_PUBLIC_STORE_SLUG` neste build (servidor). */
  slugFromBuild: string | null;
  /** Slug esperado no banco para este admin. */
  expectedSlug: typeof STORE_SLUG_ELITE_KITS;
  /** `true` se o build não tem slug (comportamento = loja principal, sem filtro de vitrine). */
  buildHasNoStoreSlug: boolean;
  /** `true` se o slug do build não é `elite_kits` (catálogo pode filtrar outro slug ou nenhum). */
  slugMismatch: boolean;
  hasSupabaseUrl: boolean;
  hasAnonKey: boolean;
  /** Service role definida na Vercel (o catálogo usa isso antes do anon). */
  hasServiceRoleKey: boolean;
  /** Cliente Supabase do catálogo público inicializou. */
  catalogClientOk: boolean;
  /** Linhas visíveis `elite_kits` vistas com o mesmo cliente do site. */
  visibleListingCount: number;
  /** Erro ao ler `product_store_listings` como o visitante (anon ou service role). */
  catalogFetchError: ListingFetchError | null;
  /** Teste extra só com chave anon (RLS): contagens/erro. */
  anonOnly: {
    ok: boolean;
    visibleListingCount: number;
    error: ListingFetchError | null;
  };
  /** Texto único para copiar/colar em suporte. */
  summaryMessage: string;
};

function formatErrorLine(e: ListingFetchError): string {
  const parts = [e.message];
  if (e.code) parts.push(`código: ${e.code}`);
  if (e.details) parts.push(`detalhes: ${e.details}`);
  if (e.hint) parts.push(`dica: ${e.hint}`);
  return parts.join(" | ");
}

export async function getEliteKitsCatalogDiagnostics(): Promise<EliteKitsCatalogDiagnostics> {
  try {
    return await runEliteKitsCatalogDiagnostics();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const slugFromBuild = getPublicStoreSlug();
    // eslint-disable-next-line no-console
    console.error("[elite-kits-diagnostics]", e);
    return {
      slugFromBuild,
      expectedSlug: STORE_SLUG_ELITE_KITS,
      buildHasNoStoreSlug: slugFromBuild == null,
      slugMismatch: slugFromBuild != null && slugFromBuild !== STORE_SLUG_ELITE_KITS,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      catalogClientOk: false,
      visibleListingCount: 0,
      catalogFetchError: { message: `Falha ao montar diagnóstico: ${message}` },
      anonOnly: { ok: false, visibleListingCount: 0, error: null },
      summaryMessage: `[Diagnóstico EliteKits — exceção]\n${message}`,
    };
  }
}

async function runEliteKitsCatalogDiagnostics(): Promise<EliteKitsCatalogDiagnostics> {
  const slugFromBuild = getPublicStoreSlug();
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const catalog = catalogClientLikePublicSite();
  const catalogClientOk = !!catalog;

  let visibleListingCount = 0;
  let catalogFetchError: ListingFetchError | null = null;

  if (catalog) {
    const { map, error } = await fetchVisibleListingPriceMap(catalog, STORE_SLUG_ELITE_KITS);
    visibleListingCount = map.size;
    catalogFetchError = error;
  }

  const anon = createPublicClient();
  let anonCount = 0;
  let anonError: ListingFetchError | null = null;
  if (anon) {
    const { map, error } = await fetchVisibleListingPriceMap(anon, STORE_SLUG_ELITE_KITS);
    anonCount = map.size;
    anonError = error;
  }

  const buildHasNoStoreSlug = slugFromBuild == null;
  const slugMismatch =
    slugFromBuild != null && slugFromBuild !== STORE_SLUG_ELITE_KITS;

  const lines: string[] = [
    "[Diagnóstico EliteKits — catálogo público]",
    `slug no build (NEXT_PUBLIC_STORE_SLUG): ${slugFromBuild ?? "(não definido — deploy sem vitrine secundária)"}`,
    `slug esperado no banco: ${STORE_SLUG_ELITE_KITS}`,
    `SUPABASE_SERVICE_ROLE_KEY configurada: ${hasServiceRoleKey ? "sim" : "não (usa só anon + RLS)"}`,
    `Cliente catálogo inicializado: ${catalogClientOk ? "sim" : "não (ver URL/anon)"}`,
    `Listagens visíveis (mesmo cliente do site): ${visibleListingCount}`,
  ];

  if (catalogFetchError) {
    lines.push(`ERRO ao ler listagens (site): ${formatErrorLine(catalogFetchError)}`);
  }
  if (anon) {
    lines.push(`Listagens visíveis (só anon): ${anonCount}`);
    if (anonError) {
      lines.push(`ERRO ao ler listagens (anon): ${formatErrorLine(anonError)}`);
    }
  }

  if (buildHasNoStoreSlug) {
    lines.push(
      "AVISO: sem NEXT_PUBLIC_STORE_SLUG no build, o catálogo público NÃO filtra por vitrine — comportamento igual à loja principal."
    );
  }
  if (slugMismatch) {
    lines.push(
      `AVISO: o slug no build (${slugFromBuild}) não é ${STORE_SLUG_ELITE_KITS}. O admin grava em ${STORE_SLUG_ELITE_KITS}; o site pode estar filtrando outro slug.`
    );
  }
  if (!hasServiceRoleKey && anonCount === 0 && visibleListingCount === 0 && !catalogFetchError && !anonError) {
    lines.push(
      "Dica: zero listagens visíveis no banco para este slug, ou RLS bloqueou anon (confira se a linha existe com visible=true e store_slug=elite_kits)."
    );
  }

  return {
    slugFromBuild,
    expectedSlug: STORE_SLUG_ELITE_KITS,
    buildHasNoStoreSlug,
    slugMismatch,
    hasSupabaseUrl,
    hasAnonKey,
    hasServiceRoleKey,
    catalogClientOk,
    visibleListingCount,
    catalogFetchError,
    anonOnly: {
      ok: !!anon,
      visibleListingCount: anonCount,
      error: anonError,
    },
    summaryMessage: lines.join("\n"),
  };
}

