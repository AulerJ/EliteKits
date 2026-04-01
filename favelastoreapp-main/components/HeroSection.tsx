"use client";

import { useEffect, useState } from "react";

export function HeroSection({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) return null;

  // Hero só no celular; oculto no PC (md e acima).
  if (images.length === 1) {
    return (
      <section className="relative w-full overflow-hidden md:hidden">
        <img
          src={images[0]}
          alt=""
          className="block w-full h-auto"
          fetchPriority="high"
        />
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden md:hidden">
      <img
        key={index}
        src={images[index]}
        alt=""
        className="block w-full h-auto"
        fetchPriority={index === 0 ? "high" : undefined}
      />
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "bg-white scale-125" : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
