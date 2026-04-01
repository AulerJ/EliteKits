"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, ThumbsUp, Grid3X3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HomeReviewsCarouselProps = {
  images: string[];
};

export function HomeReviewsCarousel({ images }: HomeReviewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateActiveCard = () => {
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-review-card]")
      );
      if (!cards.length) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    updateActiveCard();
    container.addEventListener("scroll", updateActiveCard, { passive: true });
    window.addEventListener("resize", updateActiveCard);

    return () => {
      container.removeEventListener("scroll", updateActiveCard);
      window.removeEventListener("resize", updateActiveCard);
    };
  }, [images.length]);

  function scrollToIndex(index: number) {
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>("[data-review-card]");
    const nextCard = cards[index];
    if (!nextCard) return;

    nextCard.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    setActiveIndex(index);
  }

  function goPrevious() {
    const nextIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
    scrollToIndex(nextIndex);
  }

  function goNext() {
    const nextIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
    scrollToIndex(nextIndex);
  }

  function goPreviousMobile() {
    setActiveIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function goNextMobile() {
    setActiveIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container || images.length <= 1) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    pointerStartXRef.current = event.clientX;
    scrollStartLeftRef.current = container.scrollLeft;
    container.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container || !isDraggingRef.current) return;

    const deltaX = event.clientX - pointerStartXRef.current;
    container.scrollLeft = scrollStartLeftRef.current - deltaX;
  }

  function finishDragging(event?: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container) return;

    if (event && container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    isDraggingRef.current = false;
    setIsDragging(false);
  }

  function handleMobilePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (images.length <= 1) return;
    isDraggingRef.current = true;
    pointerStartXRef.current = event.clientX;
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMobilePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    setDragOffset(event.clientX - pointerStartXRef.current);
  }

  function handleMobilePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;

    const deltaX = event.clientX - pointerStartXRef.current;
    isDraggingRef.current = false;
    setDragOffset(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (deltaX <= -45) {
      goNextMobile();
    } else if (deltaX >= 45) {
      goPreviousMobile();
    }
  }

  function getWrappedIndex(index: number) {
    if (!images.length) return 0;
    return (index + images.length) % images.length;
  }

  function getCardStyle(index: number) {
    const previousIndex = getWrappedIndex(activeIndex - 1);
    const nextIndex = getWrappedIndex(activeIndex + 1);

    if (index === activeIndex) {
      return {
        transform: `translateX(${dragOffset * 0.16}px) scale(1) rotate(0deg)`,
        opacity: 1,
        zIndex: 3,
      };
    }

    if (index === previousIndex) {
      return {
        transform: `translateX(calc(-50% + ${dragOffset * 0.08}px)) scale(0.9) rotate(-9deg)`,
        opacity: 0.92,
        zIndex: 2,
      };
    }

    if (index === nextIndex) {
      return {
        transform: `translateX(calc(50% + ${dragOffset * 0.08}px)) scale(0.9) rotate(9deg)`,
        opacity: 0.92,
        zIndex: 2,
      };
    }

    return {
      transform: "scale(0.82)",
      opacity: 0,
      zIndex: 1,
    };
  }

  if (!images.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-0 pb-16 pt-4 md:px-6 md:pt-6">
      <div className="mx-4 mb-8 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent md:mx-0" />
      <div className="rounded-none bg-gradient-to-b from-sky-100 via-white to-white px-1 py-8 shadow-[0_24px_80px_-48px_rgba(14,165,233,0.55)] md:rounded-[2rem] md:px-6 md:py-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            Seu feedback &eacute; importante
          </h2>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            Compreu e gostou? Mande uma foto com sua opini&atilde;o para n&oacute;s pelo WhatsApp! Sua foto pode aparecer aqui e fazer a diferen&ccedil;a para outros clientes.
          </p>
          {images.length > 1 && (
            <Link
              href="/depoimentos"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <Grid3X3 className="h-4 w-4" />
              Ver todos os feedback
            </Link>
          )}
        </div>

        <div className="relative md:hidden">
          <div
            className="relative h-[330px] overflow-hidden"
            onPointerDown={handleMobilePointerDown}
            onPointerMove={handleMobilePointerMove}
            onPointerUp={handleMobilePointerEnd}
            onPointerCancel={handleMobilePointerEnd}
          >
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPreviousMobile}
                  className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-lg"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNextMobile}
                  className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-lg"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {images.map((image, index) => {
              const style = getCardStyle(index);
              const isVisible =
                index === activeIndex ||
                index === getWrappedIndex(activeIndex - 1) ||
                index === getWrappedIndex(activeIndex + 1);

              return (
                <article
                  key={`${image}-mobile-${index}`}
                  className={`absolute left-1/2 top-3 aspect-[4/5] w-[58%] -translate-x-1/2 overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-xl transition duration-300 ${
                    isVisible ? "" : "pointer-events-none"
                  }`}
                  style={style}
                >
                  <Image
                    src={image}
                    alt={`Foto de cliente ${index + 1}`}
                    fill
                    sizes="58vw"
                    className="object-cover"
                    loading={index === activeIndex ? "eager" : "lazy"}
                    unoptimized={image.startsWith("http")}
                    draggable={false}
                  />
                </article>
              );
            })}
          </div>
        </div>

        <div className="relative hidden md:block">
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-lg transition hover:scale-105 hover:bg-white md:flex"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-lg transition hover:scale-105 hover:bg-white md:flex"
                aria-label="Pr&oacute;xima foto"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
            onPointerLeave={finishDragging}
            className={`no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[10%] py-3 select-none lg:px-14 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ touchAction: "pan-x" }}
          >
            {images.map((image, index) => {
              const isActive = index === activeIndex;
              return (
                <article
                  key={`${image}-${index}`}
                  data-review-card
                  className={`relative aspect-[4/5] w-[43%] flex-none snap-center overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-xl transition duration-300 lg:w-[29%] ${
                    isActive
                      ? "scale-100 opacity-100"
                      : "scale-[0.96] opacity-80"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Foto de cliente ${index + 1}`}
                    fill
                    sizes="(max-width: 1024px) 43vw, 29vw"
                    className="object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                    unoptimized={image.startsWith("http")}
                    draggable={false}
                  />
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-3 text-yellow-400">
            <ThumbsUp className="h-7 w-7 text-amber-500" fill="currentColor" />
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className="h-6 w-6 fill-current"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-center text-2xl font-semibold tracking-tight text-zinc-900">
            <GoogleIcon className="h-7 w-7 flex-shrink-0" />
            <p>5.0 average rating</p>
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Ir para foto ${index + 1}`}
                  className={`h-2.5 rounded-full transition ${
                    index === activeIndex
                      ? "w-7 bg-zinc-900"
                      : "w-2.5 bg-zinc-300 hover:bg-zinc-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.045 6.053 29.271 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.045 6.053 29.271 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.169 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.182 35.092 26.715 36 24 36c-5.219 0-9.621-3.317-11.284-7.946l-6.523 5.025C9.5 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.085 5.571h.001l6.191 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}
