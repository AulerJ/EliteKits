import Link from "next/link";
import { getHomeReviewImages } from "@/lib/supabase/queries";
import { FeedbackGridWithLightbox } from "@/components/FeedbackGridWithLightbox";
import { FeedbackWhatsAppCta } from "@/components/FeedbackWhatsAppCta";
import { siteDisplayName } from "@/lib/site-brand";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

export const revalidate = 180;

const _brand = siteDisplayName();
export const metadata = {
  title: `Depoimentos | ${_brand}`,
  description: `Fotos e feedback de clientes que compraram na ${_brand}.`,
};

export default async function DepoimentosPage() {
  const ac = publicStorefrontAccent();
  const images = await getHomeReviewImages();
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5511999999999";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Voltar à home
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Feedback de alguns dos nossos clientes
        </h1>
        <p className="mt-2 text-zinc-600">
        Comprou também? Envie a sua foto! 📸
        </p>
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <p className="text-zinc-600">Ainda não há depoimentos publicados.</p>
          <FeedbackWhatsAppCta whatsappNumber={whatsappNumber} className="mt-8" />
          <Link href="/" className={ac.depoimentosLink}>
            Voltar à home
          </Link>
        </div>
      ) : (
        <>
          <FeedbackGridWithLightbox images={images} />
          <FeedbackWhatsAppCta whatsappNumber={whatsappNumber} className="mt-12" />
        </>
      )}
    </main>
  );
}
