"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type FeedbackGridWithLightboxProps = {
  images: string[];
};

export function FeedbackGridWithLightbox({ images }: FeedbackGridWithLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goPrev = useCallback(() => {
    setOpenIndex((i) => (i == null ? null : i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setOpenIndex((i) => (i == null ? null : i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, goPrev, goNext]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-md transition hover:ring-2 hover:ring-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Image
              src={image}
              alt={`Depoimento de cliente ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              unoptimized={image.startsWith("http")}
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar foto ampliada"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 md:left-4"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 md:right-4"
                aria-label="Próxima foto"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div
            className="relative h-[70vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const end = e.changedTouches[0].clientX;
              if (touchStart != null) {
                const diff = touchStart - end;
                if (diff > 50) goNext();
                if (diff < -50) goPrev();
              }
              setTouchStart(null);
            }}
          >
            <Image
              src={images[openIndex]}
              alt={`Depoimento ${openIndex + 1} de ${images.length}`}
              fill
              className="object-contain"
              unoptimized={images[openIndex].startsWith("http")}
              priority
            />
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
            {openIndex + 1} de {images.length}
          </p>
        </div>
      )}
    </>
  );
}
