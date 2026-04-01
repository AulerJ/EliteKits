"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Share2, ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";
import { siteDisplayName } from "@/lib/site-brand";

export interface ProductForModal {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  size: string | null;
  imageUrls: string[];
  /** Se false, não exibe "Tamanho" (ex.: óculos). Omitir/true = exibe quando tiver size. */
  showSize?: boolean;
}

interface ProductModalProps {
  product: ProductForModal;
  allProducts: ProductForModal[];
  whatsappNumber: string;
  onClose: () => void;
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
}

export function ProductModal({
  product,
  allProducts,
  whatsappNumber,
  onClose,
  onPrevProduct,
  onNextProduct,
}: ProductModalProps) {
  const { addItem } = useCart();
  const productIndex = allProducts.findIndex((p) => p.id === product.id);
  const currentProduct = allProducts[Math.max(0, productIndex)] ?? product;
  const hasImages = currentProduct.imageUrls.length > 0;
  const [imgIndex, setImgIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const hasPrevProduct = productIndex > 0;
  const hasNextProduct = productIndex >= 0 && productIndex < allProducts.length - 1;
  const hasMultipleImages = currentProduct.imageUrls.length > 1;

  useEffect(() => {
    setImgIndex(0);
  }, [currentProduct.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Esconder botão WhatsApp global quando modal está aberto
    const hideWhatsApp = () => {
      const whatsappBtn = document.querySelector('[aria-label="Contato via WhatsApp"]') as HTMLElement;
      if (whatsappBtn) whatsappBtn.style.display = "none";
    };
    hideWhatsApp();
    // Usar timeout para garantir que o elemento existe
    const timeout = setTimeout(hideWhatsApp, 100);
    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = "";
      // Mostrar botão WhatsApp global quando modal fecha
      const whatsappBtn = document.querySelector('[aria-label="Contato via WhatsApp"]') as HTMLElement;
      if (whatsappBtn) whatsappBtn.style.display = "";
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (hasMultipleImages) {
          setImgIndex((i) => (i === 0 ? currentProduct.imageUrls.length - 1 : i - 1));
        } else if (hasPrevProduct && onPrevProduct) {
          onPrevProduct();
        }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (hasMultipleImages) {
          setImgIndex((i) => (i === currentProduct.imageUrls.length - 1 ? 0 : i + 1));
        } else if (hasNextProduct && onNextProduct) {
          onNextProduct();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentProduct.imageUrls.length, hasPrevProduct, hasNextProduct, onClose, onPrevProduct, onNextProduct]);

  const hasName = currentProduct.name?.trim() && !currentProduct.name.match(/^produto\s*-?\s*\d+$/i);
  const brand = siteDisplayName();
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";
  const productUrl = `${origin}/produto/${currentProduct.id}`;
  const whatsappText = hasName
    ? `Olá! Tenho interesse no produto: ${currentProduct.name!.trim()} - ${productUrl}`
    : `Olá! Tenho interesse neste produto: ${productUrl}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  async function handleShare() {
    const url = productUrl;
    const title = hasName ? `${currentProduct.name!.trim()} | ${brand}` : brand;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: hasName ? currentProduct.name!.trim() : `Confira este produto na ${brand}`,
        });
      } catch (err) {
        copyLink(url);
      }
    } else {
      copyLink(url);
    }
  }

  function copyLink(url: string) {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(url).then(() => alert("Link copiado!")).catch(() => alert(url));
  }

  const goPrevImg = () => {
    setImgIndex((i) => (i === 0 ? currentProduct.imageUrls.length - 1 : i - 1));
  };

  const goNextImg = () => {
    setImgIndex((i) => (i === currentProduct.imageUrls.length - 1 ? 0 : i + 1));
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Se movimento vertical for maior que horizontal, não fazer swipe (permite scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    // Aplicar transform visual durante o swipe
    if (imageContainerRef.current) {
      const translateX = Math.max(-100, Math.min(100, deltaX));
      imageContainerRef.current.style.transform = `translateX(${translateX}px)`;
      imageContainerRef.current.style.transition = "none";
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const minSwipeDistance = 50;

    // Reset transform
    if (imageContainerRef.current) {
      imageContainerRef.current.style.transform = "";
      imageContainerRef.current.style.transition = "";
    }

    // Se movimento vertical for maior, não fazer swipe
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    // Swipe para esquerda (próximo)
    if (deltaX < -minSwipeDistance) {
      if (hasMultipleImages) {
        goNextImg();
      } else if (hasNextProduct && onNextProduct) {
        setIsTransitioning(true);
        onNextProduct();
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
    // Swipe para direita (anterior)
    else if (deltaX > minSwipeDistance) {
      if (hasMultipleImages) {
        goPrevImg();
      } else if (hasPrevProduct && onPrevProduct) {
        setIsTransitioning(true);
        onPrevProduct();
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-900"
      onClick={onClose}
    >
      {/* Botão fechar */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-lg backdrop-blur-sm transition hover:bg-white"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Imagem central */}
      <div
        className="relative flex flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {hasImages ? (
          <div
            ref={imageContainerRef}
            className={`relative h-full w-full transition-transform duration-300 ease-out ${
              isTransitioning ? "opacity-50" : "opacity-100"
            }`}
          >
            <Image
              key={`${currentProduct.id}-${imgIndex}`}
              src={currentProduct.imageUrls[imgIndex]}
              alt={currentProduct.name?.trim() ? `${currentProduct.name.trim()} - foto ${imgIndex + 1}` : `Foto ${imgIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-zinc-500">
            <span>Sem foto</span>
          </div>
        )}

        {/* Botões trocar FOTO - visíveis (fundo branco) */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrevImg();
              }}
              className="absolute left-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl transition hover:bg-zinc-100"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNextImg();
              }}
              className="absolute right-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl transition hover:bg-zinc-100"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-8 w-8" strokeWidth={2.5} />
            </button>
            <div className="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 gap-2">
              {currentProduct.imageUrls.map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === imgIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Botões trocar PRODUTO - anterior e próximo sempre visíveis */}
        {allProducts.length > 1 && (
          <>
            {hasPrevProduct && onPrevProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTransitioning(true);
                  onPrevProduct();
                  setTimeout(() => setIsTransitioning(false), 300);
                }}
                className="absolute left-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-xl backdrop-blur-sm transition hover:bg-white"
                aria-label="Produto anterior"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
              </button>
            )}
            {hasNextProduct && onNextProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTransitioning(true);
                  onNextProduct();
                  setTimeout(() => setIsTransitioning(false), 300);
                }}
                className="absolute right-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-xl backdrop-blur-sm transition hover:bg-white"
                aria-label="Próximo produto"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Card do produto: fundo claro, visual de site */}
      {(currentProduct.name?.trim() || currentProduct.price != null || (currentProduct.size && currentProduct.showSize !== false) || hasMultipleImages || allProducts.length > 1) && (
        <div
          className="flex flex-shrink-0 flex-col gap-5 rounded-t-2xl bg-white px-5 pt-5 pb-8 shadow-[0_-4px_24px_rgba(0,0,0,0.15)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            {currentProduct.name?.trim() && !currentProduct.name.match(/^produto\s*-?\s*\d+$/i) && (
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">{currentProduct.name.trim()}</h2>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              {currentProduct.size && currentProduct.showSize !== false && (
                <span className="font-medium text-zinc-600">
                  Tamanho: <span className="text-zinc-900">{currentProduct.size}</span>
                </span>
              )}
              {(hasMultipleImages || allProducts.length > 1) && (
                <span className="text-zinc-400">
                  {hasMultipleImages && `${imgIndex + 1}/${currentProduct.imageUrls.length} fotos`}
                  {hasMultipleImages && allProducts.length > 1 && " · "}
                  {allProducts.length > 1 && `Produto ${productIndex + 1} de ${allProducts.length}`}
                </span>
              )}
            </div>
            {currentProduct.price != null && (
              <p className="text-2xl font-bold text-green-600">
                US$ {Number(currentProduct.price).toFixed(2)}
              </p>
            )}
          </div>

          <div className="h-px bg-zinc-200" />

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                addItem(
                  {
                    id: currentProduct.size ? `${currentProduct.id}__${currentProduct.size}` : currentProduct.id,
                    name: currentProduct.name?.trim() && !currentProduct.name.match(/^produto\s*-?\s*\d+$/i) ? currentProduct.name : null,
                    price: currentProduct.price,
                    imageUrl: currentProduct.imageUrls[0] ?? null,
                    size: currentProduct.size ?? null,
                  },
                  1,
                  (currentProduct as { stock?: number | null }).stock ?? null
                );
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-600/25 transition hover:bg-green-500"
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              Adicionar ao carrinho
            </button>
            <div className="flex items-center justify-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366] hover:text-white"
                aria-label="Falar com vendedor"
                title="Falar com vendedor"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Falar com vendedor</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
