"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_NAV_IDS = "favelastore_product_nav_ids";
const STORAGE_IDS = "favelastore_busca_ids";
const SWIPE_MIN = 50;

export function ProductSwipeNav({
  productId,
  children,
}: {
  productId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const updateNav = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const navRaw = sessionStorage.getItem(STORAGE_NAV_IDS);
      const searchRaw = sessionStorage.getItem(STORAGE_IDS);
      const navIds: string[] = navRaw ? JSON.parse(navRaw) : [];
      const searchIds: string[] = searchRaw ? JSON.parse(searchRaw) : [];
      const ids = navIds.length > 0 && navIds.includes(productId) ? navIds : searchIds;
      const i = ids.indexOf(productId);
      if (i < 0 || ids.length < 2) return;
      setPrevId(i > 0 ? ids[i - 1] : null);
      setNextId(i < ids.length - 1 ? ids[i + 1] : null);
    } catch {
      setPrevId(null);
      setNextId(null);
    }
  }, [productId]);

  useEffect(() => {
    updateNav();
  }, [updateNav]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = Date.now();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;
    const dx = x - touchStartX.current;
    const dy = y - touchStartY.current;
    touchStart.current = null;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < SWIPE_MIN) return;
    if (absDy > absDx) return;
    if (dx > SWIPE_MIN && prevId) {
      router.push(`/produto/${prevId}`);
    } else if (dx < -SWIPE_MIN && nextId) {
      router.push(`/produto/${nextId}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && prevId) {
      e.preventDefault();
      router.push(`/produto/${prevId}`);
    } else if (e.key === "ArrowRight" && nextId) {
      e.preventDefault();
      router.push(`/produto/${nextId}`);
    }
  };

  return (
    <div
      className="outline-none touch-pan-y"
      style={{ touchAction: "pan-y" }}
      tabIndex={0}
      role="region"
      aria-label="Navegação do produto: deslize para o lado ou use setas para anterior ou próximo"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
