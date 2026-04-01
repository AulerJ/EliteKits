"use client";

import Link from "next/link";
import { useId } from "react";
import { ExternalLink } from "lucide-react";

type InstagramSectionProps = {
  instagramUrl: string;
  username: string;
  embedSrc: string;
};

/** Ícone do Instagram com gradiente (câmera) */
function InstagramIcon({ gradientId, className }: { gradientId: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={`url(#${gradientId})`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f09351" />
          <stop offset="50%" stopColor="#d53a7f" />
          <stop offset="100%" stopColor="#f58529" />
        </linearGradient>
      </defs>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function InstagramSection({
  instagramUrl,
  username,
  embedSrc,
}: InstagramSectionProps) {
  const idLeft = useId();
  const idRight = useId();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6" aria-label="Instagram">
      <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
      <div className="px-1">
        <Link
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mb-5 flex items-center justify-center gap-3 py-4 transition"
          aria-label={`Veja mais no nosso Instagram @${username}`}
        >
          <InstagramIcon gradientId={idLeft} className="h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9" />
          <span className="text-center text-lg font-bold text-zinc-900 transition-all duration-200 group-hover:bg-gradient-to-r group-hover:from-[#f09351] group-hover:via-[#d53a7f] group-hover:to-[#f58529] group-hover:bg-clip-text group-hover:text-transparent sm:text-xl">
            Veja mais no nosso Instagram
          </span>
          <InstagramIcon gradientId={idRight} className="h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9" />
        </Link>

        <iframe
          src={embedSrc}
          title={`Instagram @${username}`}
          scrolling="yes"
          allow="encrypted-media"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          className="min-h-[500px] w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm sm:min-h-[560px]"
        />

        <div className="mt-5 flex justify-center">
          <Link
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:shadow-lg"
            aria-label={`Abrir perfil @${username} no Instagram`}
          >
            Abrir perfil no Instagram
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
