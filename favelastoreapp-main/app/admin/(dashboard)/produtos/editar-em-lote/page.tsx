import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BulkEditForm } from "../BulkEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ parent?: string }>;
}

export default async function EditarEmLotePage({ searchParams }: PageProps) {
  const { parent } = await searchParams;
  if (!parent) {
    return (
      <div>
        <p className="text-zinc-600">Selecione uma pasta de produtos primeiro.</p>
        <Link href="/admin/produtos" className="mt-4 inline-block text-green-600 hover:underline">
          Voltar para Produtos
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: products } = await supabase
    .schema("favelastore")
    .from("products")
    .select(
      `id, name, slug, price, size, sort_order,
      product_images(url, storage_path)`
    )
    .eq("category_id", parent)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <Link
        href={`/admin/produtos?parent=${encodeURIComponent(parent)}`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">Editar produtos em lote</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Altere nome e preço abaixo. Deixe o nome em branco para o produto ficar sem nome (só a foto).
      </p>
      <BulkEditForm parentId={parent} products={products ?? []} />
    </div>
  );
}
