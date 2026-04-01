"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  imageUrls: string[];
  alt: string;
}

export function ProductImageGallery({ imageUrls, alt }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const hasUrls = imageUrls.length > 0;
  const currentUrl = hasUrls ? imageUrls[activeIndex] : null;
  const showPlaceholder = !hasUrls || loadError;

  const handleImageError = () => setLoadError(true);
  const handleImageLoad = () => setLoadError(false);
  const goTo = (index: number) => {
    setActiveIndex(index);
    setLoadError(false);
  };

  if (!hasUrls) {
    return (
      <div className="relative flex aspect-square items-center justify-center bg-zinc-200 text-zinc-500">
        <span className="text-sm font-medium">Sem foto</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-zinc-100">
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-200 text-zinc-500">
          <span className="text-sm font-medium">Sem foto</span>
        </div>
      ) : (
        <Image
          src={currentUrl!}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 512px"
          priority
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex > 0 ? activeIndex - 1 : imageUrls.length - 1)}
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
            aria-label="Foto anterior"
          >
            <svg className="h-5 w-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex < imageUrls.length - 1 ? activeIndex + 1 : 0)}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
            aria-label="Próxima foto"
          >
            <svg className="h-5 w-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {imageUrls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition ${
                  i === activeIndex ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
                }`}
                aria-label={`Ver foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
