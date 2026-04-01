"use client";

import Image from "next/image";
import Link from "next/link";
import { siteDisplayName } from "@/lib/site-brand";

export function HomeFooter({
  whatsappNumber,
}: {
  whatsappNumber: string;
}) {
  const brand = siteDisplayName();
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vim pelo site da ${brand}.`)}`
    : "#";

  return (
    <footer className="border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] text-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt={brand}
            width={240}
            height={240}
            className="h-auto w-[190px] object-contain sm:w-[240px]"
            priority={false}
          />

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            D&uacute;vidas, pedidos e atendimento r&aacute;pido no nosso WhatsApp.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
            {whatsappNumber && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full max-w-[260px] items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.8)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#25D366]/40 hover:bg-white/8 sm:w-auto"
                aria-label={`WhatsApp da ${brand}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md transition group-hover:scale-105">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-white">
                    WhatsApp
                  </span>
                  <span className="block text-xs text-zinc-400">
                    +1 (203) 394-7243
                  </span>
                </div>
              </Link>
            )}
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.22em] text-zinc-500">
            {brand}
          </p>
        </div>
      </section>
      <div className="h-4 bg-black" aria-hidden />
    </footer>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
