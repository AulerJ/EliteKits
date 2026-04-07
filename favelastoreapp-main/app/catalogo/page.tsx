import { CategoryCard } from "@/components/CategoryCard";
import { CustomOrderCta } from "@/components/CustomOrderCta";
import { getCategories } from "@/lib/supabase/queries";
import { isSecondaryStorefront } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const categories = await getCategories();
  const secondary = isSecondaryStorefront();
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5511999999999";

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
            Cat&aacute;logo
          </h1>
          <p className="mt-2 text-zinc-600">
            {secondary
              ? "Categorias da vitrine EliteKits — em cada uma, só entram itens que você aprovou no admin"
              : "Escolha uma categoria para ver todos os produtos"}
          </p>
          <CustomOrderCta whatsappNumber={whatsappNumber} variant="inline" className="mt-3" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              name={category.name}
              slug={category.slug}
              image={category.image}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
