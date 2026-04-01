import Image from "next/image";
import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { STORE_SLUG_ELITE_KITS } from "@/lib/store";
import { siteDisplayName } from "@/lib/site-brand";
import { saveEliteKitsStoreListing } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
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

export default async function EliteKitsListingsAdminPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const db = createServiceRoleClient() ?? supabase;
  const brand = siteDisplayName();

  const term = q.trim();
  let prodQuery = db
    .schema("favelastore")
    .from("products")
    .select("id, name, price, product_images(url, storage_path)")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(80);

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Catálogo {brand}</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Escolha quais produtos do estoque compartilhado aparecem na vitrine{" "}
        <strong>{brand}</strong> (slug{" "}
        <code className="rounded bg-zinc-100 px-1">{STORE_SLUG_ELITE_KITS}</code>
        ). Deixe o preço em branco para usar o preço base do produto no banco; ou defina um
        preço só para este site.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Se você tinha listagens antigas com <code className="rounded bg-amber-100 px-1">soccer_lover</code>, rode no
        Supabase o SQL da migration{" "}
        <code className="rounded bg-amber-100 px-1">20250319000000_rename_store_slug_to_elite_kits.sql</code>.
      </p>

      <form method="get" className="mt-6 flex max-w-lg flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
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

      {prodErr && (
        <p className="mt-4 text-sm text-red-600">
          Erro ao carregar produtos: {prodErr.message}
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {(products ?? []).map((p) => {
          const imgs = p.product_images as { url?: string | null; storage_path?: string | null }[] | null;
          const first = imgs?.[0];
          const thumb = imageThumb(first?.url, first?.storage_path);
          const listing = listingByProduct.get(p.id as string);
          const visible = listing?.visible ?? false;
          const overrideVal =
            listing?.price_override != null ? String(listing.price_override) : "";

          return (
            <li
              key={p.id as string}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" sizes="64px" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{p.name as string}</p>
                <p className="text-xs text-zinc-500">
                  Preço base:{" "}
                  {p.price != null
                    ? `US$ ${Number(p.price).toFixed(2)}`
                    : "—"}
                </p>
                <Link
                  href={`/admin/produtos/${p.id}`}
                  className="text-xs text-green-700 hover:underline"
                >
                  Editar produto
                </Link>
              </div>
              <form action={saveEliteKitsStoreListing} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="productId" value={p.id as string} />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="visible"
                    defaultChecked={visible}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Na vitrine
                </label>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Preço US$ (opcional)</label>
                  <input
                    type="text"
                    name="priceOverride"
                    defaultValue={overrideVal}
                    placeholder="Usar preço base"
                    className="mt-0.5 w-28 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500"
                >
                  Salvar
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {!prodErr && (products ?? []).length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">Nenhum produto encontrado.</p>
      )}
    </div>
  );
}
