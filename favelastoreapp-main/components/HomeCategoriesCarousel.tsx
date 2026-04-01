"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryCard } from "@/components/CategoryCard";

type CategoryItem = {
  name: string;
  slug: string;
  image: string;
};

type HomeCategoriesCarouselProps = {
  categories: CategoryItem[];
};

export function HomeCategoriesCarousel({
  categories,
}: HomeCategoriesCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mouseStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const isMouseDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInView, setIsInView] = useState(false);

  function scrollByCards(direction: "left" | "right") {
    const container = scrollRef.current;
    if (!container) return;

    const card = container.querySelector<HTMLElement>("[data-category-card]");
    const step = card ? card.offsetWidth + 16 : container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  }

  function scrollToIndex(index: number) {
    const container = scrollRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>("[data-category-card]");
    const nextCard = cards[index];
    if (!nextCard) return;

    container.scrollTo({
      left: nextCard.offsetLeft - container.offsetLeft,
      behavior: "smooth",
    });
    setActiveIndex(index);
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container) return;

    isMouseDraggingRef.current = true;
    hasDraggedRef.current = false;
    setIsDragging(true);
    mouseStartXRef.current = event.pageX;
    scrollStartLeftRef.current = container.scrollLeft;
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (!container || !isMouseDraggingRef.current) return;

    const deltaX = event.pageX - mouseStartXRef.current;
    if (Math.abs(deltaX) > 6) {
      hasDraggedRef.current = true;
    }

    event.preventDefault();
    container.scrollLeft = scrollStartLeftRef.current - deltaX;
  }

  function finishDragging() {
    isMouseDraggingRef.current = false;
    setIsDragging(false);
    window.setTimeout(() => {
      hasDraggedRef.current = false;
    }, 0);
  }

  function handleCardClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (hasDraggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleNativeDragStart(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || categories.length <= 1) return;

    const updateActiveCard = () => {
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-category-card]")
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
  }, [categories.length]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (categories.length <= 1) return;
    if (!isInView) return;

    const interval = window.setInterval(() => {
      if (isMouseDraggingRef.current) return;
      const nextIndex = activeIndex >= categories.length - 1 ? 0 : activeIndex + 1;
      scrollToIndex(nextIndex);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [activeIndex, categories.length, isInView]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => scrollByCards("left")}
        className="absolute left-0 top-[42%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md transition hover:scale-105 hover:bg-white md:left-2 md:h-12 md:w-12"
        aria-label="Categorias anteriores"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      <button
        type="button"
        onClick={() => scrollByCards("right")}
        className="absolute right-0 top-[42%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-md transition hover:scale-105 hover:bg-white md:right-2 md:h-12 md:w-12"
        aria-label="Próximas categorias"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDragging}
        onMouseLeave={finishDragging}
        onDragStartCapture={handleNativeDragStart}
        className={`no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 py-2 select-none sm:gap-4 md:px-12 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {categories.map((cat) => (
          <div
            key={cat.slug}
            data-category-card
            onClickCapture={handleCardClickCapture}
            onDragStartCapture={handleNativeDragStart}
            className="w-[39vw] max-w-[210px] min-w-[145px] flex-none snap-start sm:w-[31vw] sm:max-w-[240px] md:w-[24vw] md:max-w-none lg:w-[19vw]"
          >
            <CategoryCard
              name={cat.name}
              slug={cat.slug}
              image={cat.image}
            />
          </div>
        ))}
      </div>

      {categories.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {categories.map((cat, index) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Ir para categoria ${cat.name}`}
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
  );
}
