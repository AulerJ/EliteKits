import Image from "next/image";
import Link from "next/link";
import { publicStorefrontAccent } from "@/lib/storefront-accent";

const WHATSAPP_MESSAGE = "Olá! Gostaria de fazer uma encomenda ou personalizar um produto.";

interface HomeEncomendaBannerProps {
  imageUrl: string;
  whatsappNumber: string;
}

export function HomeEncomendaBanner({ imageUrl, whatsappNumber }: HomeEncomendaBannerProps) {
  const ac = publicStorefrontAccent();
  const cleanNumber = whatsappNumber.replace(/\D/g, "") || "5511999999999";
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={ac.homeEncomendaRing}
      >
        <div className="relative aspect-[2.5/1] w-full min-h-[140px] sm:aspect-[3/1] sm:min-h-[180px]">
          <Image
            src={imageUrl}
            alt="Encomendas e personalização — fale conosco"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 1152px"
            priority={false}
          />
        </div>
      </Link>
    </section>
  );
}
