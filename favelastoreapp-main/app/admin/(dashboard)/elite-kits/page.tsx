import Image from "next/image";
import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { STORE_SLUG_ELITE_KITS } from "@/lib/store";
import { siteDisplayName } from "@/lib/site-brand";
import { getEliteKitsCatalogDiagnostics } from "@/lib/elite-kits-diagnostics";
import { saveEliteKitsStoreListing } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; filter?: string }>;
}

function imageThumb(
  url: string | null | undefined,
  storagePath: string | null | undefined
): string | null {
  if (url) return url;
  if (storagePath?.startsWith("http")) return storagePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (base && storagePath) {
    return `${base}/storage/v1/object/public/favelastore_products/${storagePath}`;
  }
  return null;
}

type Filter = "all" | "live" | "pending";

export default async function EliteKitsListingsAdminPage({ searchParams }: PageProps) {
  const { q = "", filter: filterRaw = "all" } = await searchParams;
  const filter: Filter =
    filterRaw === "live" || filterRaw === "pending" ? filterRaw : "all";

  const supabase = await createClient();
  const db = createServiceRoleClient() ?? supabase;
  const brand = siteDisplayName();
  const catalogDiag = await getEliteKitsCatalogDiagnostics();

  const term = q.trim();
  let prodQuery = db
    .schema("favelastore")
    .from("products")
    .select("id, name, price, product_images(url, storage_path)")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(120);

  if (term) {
    prodQuery = prodQuery.ilike("name", `%${term}%`);
  }

  const { data: products, error: prodErr } = await prodQuery;

  const { data: listings } = await db
    .schema("favelastore")
    .from("product_store_listings")
    .select("product_id, visible, price_override")
    .eq("store_slug", STORE_SLUG_ELITE_KITS);

  const listingByProduct = new Map(
    (listings ?? []).map((row) => [
      row.product_id as string,
      {
        visible: row.visible as boolean,
        price_override: row.price_override as number | null,
      },
    ])
  );

  const rows = (products ?? []).map((p) => {
    const imgs = p.product_images as
      | { url?: string | null; storage_path?: string | null }[]
      | null;
    const first = imgs?.[0];
    const thumb = imageThumb(first?.url, first?.storage_path);
    const listing = listingByProduct.get(p.id as string);
    const visible = listing?.visible ?? false;
    const overrideVal =
      listing?.price_override != null ? String(listing.price_override) : "";
    return { p, thumb, visible, overrideVal };
  });

  const filtered =
    filter === "live"
      ? rows.filter((r) => r.visible)
      : filter === "pending"
        ? rows.filter((r) => !r.visible)
        : rows;

  const liveCount = rows.filter((r) => r.visible).length;
  const pendingCount = rows.filter((r) => !r.visible).length;

  const qParam = term ? `&q=${encodeURIComponent(term)}` : "";

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-zinc-900">Vitrine {brand}</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        O estoque é compartilhado com a Favela Store. Aqui você decide o que entra no site{" "}
        <strong>{brand}</strong> (slug{" "}
        <code className="rounded bg-slate-100 px-1">{STORE_SLUG_ELITE_KITS}</code>
        ). Só itens com status <strong>Publicado</strong> aparecem para clientes — na home, nas
        categorias e na busca.
      </p>

      <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50/90 p-4 text-sm text-cyan-950">
        <p className="font-semibold">Checklist rápido</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Marque <strong>Publicar na vitrine {brand}</strong> e clique em <strong>Salvar</strong>.
            Sem isso, o produto continua oculto para visitantes.
          </li>
          <li>
            No deploy (Vercel), use{" "}
            <code className="rounded bg-white px-1">NEXT_PUBLIC_STORE_SLUG=elite_kits</code> e faça
            redeploy após alterar variáveis <code className="rounded bg-white px-1">NEXT_PUBLIC_*</code>.
          </li>
          <li>
            Preço em branco = usa o preço base do produto; ou defina um preço só para este site.
          </li>
        </ol>
      </div>

      <p className="mt-3 text-xs text-amber-800">
        Listagens antigas com slug <code className="rounded bg-amber-100 px-1">soccer_lover</code>{" "}
        devem ser migradas com{" "}
        <code className="rounded bg-amber-100 px-1">20250319000000_rename_store_slug_to_elite_kits.sql</code>.
      </p>

      <div
        className={`mt-6 rounded-xl border p-4 text-sm ${
          catalogDiag.catalogFetchError || catalogDiag.anonOnly.error || catalogDiag.slugMismatch
            ? "border-red-300 bg-red-50 text-red-950"
            : catalogDiag.buildHasNoStoreSlug
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-slate-50 text-slate-800"
        }`}
      >
        <p className="font-semibold">Diagnóstico do catálogo público (mesmo que o visitante)</p>
        <p className="mt-1 text-xs opacity-90">
          Copie o bloco abaixo se precisar de suporte. Ele mostra o slug embutido no deploy, se a leitura das
          listagens falhou (mensagem do Supabase) e quantos itens publicados o site enxerga.
        </p>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-black/10 bg-white/80 p-3 font-mono text-xs leading-relaxed text-inherit">
          {catalogDiag.summaryMessage}
        </pre>
        {(catalogDiag.catalogFetchError || catalogDiag.anonOnly.error) && (
          <p className="mt-3 text-xs font-medium">
            Se aparecer <strong>permission denied</strong> ou <strong>RLS</strong>, confira no Supabase as policies da
            tabela <code className="rounded bg-white/80 px-1">favelastore.product_store_listings</code> e se o schema
            está exposto na API. Se o slug no build estiver vazio ou diferente de{" "}
            <code className="rounded bg-white/80 px-1">{STORE_SLUG_ELITE_KITS}</code>, ajuste a variável na Vercel e
            faça redeploy.
          </p>
        )}
      </div>

      <form method="get" className="mt-6 flex max-w-xl flex-wrap items-end gap-2">
        <input type="hidden" name="filter" value={filter} />
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="block text-sm font-medium text-zinc-700">
            Buscar produto
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={term}
            placeholder="Nome..."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Buscar
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterLink
          href={`/admin/elite-kits?filter=all${qParam}`}
          active={filter === "all"}
          label={`Todos (${rows.length})`}
        />
        <FilterLink
          href={`/admin/elite-kits?filter=live${qParam}`}
          active={filter === "live"}
          label={`Publicados (${liveCount})`}
        />
        <FilterLink
          href={`/admin/elite-kits?filter=pending${qParam}`}
          active={filter === "pending"}
          label={`Não publicados (${pendingCount})`}
        />
      </div>

      {prodErr && (
        <p className="mt-4 text-sm text-red-600">Erro ao carregar produtos: {prodErr.message}</p>
      )}

      <ul className="mt-8 space-y-4">
        {filtered.map(({ p, thumb, visible, overrideVal }) => (
          <li
            key={p.id as string}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center"
          >
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" sizes="80px" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-900">{p.name as string}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      visible
                        ? "bg-cyan-100 text-cyan-900"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {visible ? "Publicado" : "Oculto"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Preço base:{" "}
                  {p.price != null ? `US$ ${Number(p.price).toFixed(2)}` : "—"}
                </p>
                <Link
                  href={`/admin/produtos/${p.id}`}
                  className="mt-1 inline-block text-xs text-cyan-700 hover:underline"
                >
                  Editar produto (estoque compartilhado)
                </Link>
              </div>
            </div>

            <form
              action={saveEliteKitsStoreListing}
              className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-end sm:border-t-0 sm:pt-0"
            >
              <input type="hidden" name="productId" value={p.id as string} />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  name="visible"
                  value="on"
                  defaultChecked={visible}
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                />
                Publicar na vitrine {brand}
              </label>
              <div>
                <label className="block text-xs font-medium text-zinc-600">Preço US$ (opcional)</label>
                <input
                  type="text"
                  name="priceOverride"
                  defaultValue={overrideVal}
                  placeholder="Usar preço base"
                  className="mt-0.5 w-full min-w-[8rem] rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:w-32"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Salvar
              </button>
            </form>
          </li>
        ))}
      </ul>

      {!prodErr && filtered.length === 0 && rows.length > 0 && (
        <p className="mt-8 text-sm text-zinc-500">
          Nenhum produto neste filtro. Troque para &quot;Todos&quot; ou &quot;Não publicados&quot;.
        </p>
      )}

      {!prodErr && rows.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">Nenhum produto encontrado.</p>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}
