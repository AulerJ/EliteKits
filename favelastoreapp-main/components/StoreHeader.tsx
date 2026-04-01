"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Menu, X, Search, ChevronRight, LogOut, Instagram } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { CATEGORIES } from "@/lib/categories";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { siteDisplayName } from "@/lib/site-brand";

const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_URL || "/logo.png";
const SITE_NAME = siteDisplayName();
const igHandle = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME?.replace(/^@/, "").trim();
const INSTAGRAM_URL = igHandle
  ? `https://www.instagram.com/${igHandle}/`
  : "https://www.instagram.com/";

const DRAWER_WIDTH = 300;

type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  path: string[];
  children: CategoryTreeNode[];
};

export function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>(() =>
    CATEGORIES.map((c) => ({
      id: c.slug,
      name: c.name,
      slug: c.slug,
      path: [c.slug],
      children: [],
    }))
  );
  const [categoriesLoadedFromApi, setCategoriesLoadedFromApi] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdminLoggedIn(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogoutStore() {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    closeDrawer();
    router.push(pathname);
    router.refresh();
  }

  useEffect(() => {
    if (categoriesLoadedFromApi) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategoryTree(data);
        }
        setCategoriesLoadedFromApi(true);
      })
      .catch(() => setCategoriesLoadedFromApi(true));
  }, [categoriesLoadedFromApi]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) router.push(`/busca?q=${encodeURIComponent(q)}`);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = document?.title || SITE_NAME;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        await copyLink(url);
      }
    } else {
      await copyLink(url);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      if (typeof window !== "undefined") window.alert("Link copiado!");
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  const isActive = (href: string) => pathname === href;
  const isInCatalog = pathname.startsWith("/catalogo");

  return (
    <header className="sticky top-0 z-40 border-b border-black bg-black">
      <div className="mx-auto max-w-6xl px-3 sm:px-5">
        {/* Linha 1: mobile = [hamburger | logo | carrinho]; desktop = [logo | busca no meio | nav + carrinho]. Busca some dentro de categoria. */}
        <div className="flex h-16 items-center justify-between gap-3 sm:h-20 sm:gap-4">
          {/* Mobile: hamburger no início */}
          <div className="flex w-10 flex-shrink-0 items-center sm:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-200 hover:bg-zinc-900"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Logo: centro no mobile; à esquerda no desktop, maior no PC */}
          <div className="flex flex-1 justify-center sm:flex-none sm:justify-start">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Image
                src={LOGO_SRC}
                alt={SITE_NAME}
                width={280}
                height={70}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </Link>
          </div>

          {/* Desktop: busca no meio do header (oculta dentro de /catalogo para não duplicar) */}
          {!isInCatalog && (
          <div className="hidden flex-1 justify-center px-2 sm:flex">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produto..."
                minLength={2}
                className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-20 text-sm text-white placeholder:text-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/50"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
              >
                Buscar
              </button>
            </form>
          </div>
          )}

          {/* Mobile: compartilhar + carrinho */}
          <div className="flex flex-shrink-0 items-center justify-end gap-0.5 sm:hidden">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-200 hover:bg-zinc-900"
              aria-label="Compartilhar página"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <path d="M12 3v13M12 3l4 4M12 3L8 7" />
              </svg>
            </button>
            <Link
              href="/carrinho"
              className={`relative inline-flex items-center justify-center rounded-full p-2 text-zinc-100 transition hover:bg-zinc-900 ${
                isActive("/carrinho") ? "ring-2 ring-green-500/70" : ""
              }`}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-green-500 px-0.5 py-px text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop: compartilhar + carrinho + nav */}
          <div className="hidden flex-shrink-0 items-center gap-0.5 sm:flex sm:gap-2">
            <Link
              href="/carrinho"
              className={`relative inline-flex items-center justify-center rounded-full p-2 text-zinc-100 transition hover:bg-zinc-900 ${
                isActive("/carrinho") ? "ring-2 ring-green-500/70" : ""
              }`}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-green-500 px-0.5 py-px text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-200 hover:bg-zinc-900"
              aria-label="Compartilhar página"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <path d="M12 3v13M12 3l4 4M12 3L8 7" />
              </svg>
            </button>
            {/* Navegação desktop */}
            <nav className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                pathname === "/"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Início
            </Link>
            <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-black p-2 text-[#E4405F] transition hover:bg-zinc-900 hover:text-[#ff5c7a] sm:inline-flex"
            aria-label={`Instagram ${SITE_NAME}`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.919 0 3.264-.012 3.584-.069 4.919-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.85-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.919 0-3.264.012-3.584.07-4.919.149-3.227 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
            <Link
              href="/admin"
              className="hidden items-center justify-center rounded-full bg-black px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-900 sm:inline-flex"
              title="Área administrativa"
            >
              <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
              Admin
            </Link>
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={handleLogoutStore}
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200 sm:inline-flex"
                title="Sair e ver como visitante"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            )}
            </nav>
          </div>
        </div>

        {/* Mobile: busca em baixo (segunda linha). Oculta dentro de /catalogo. */}
        {!isInCatalog && (
        <div className="border-t border-zinc-800/80 pb-3 pt-2 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto..."
              minLength={2}
              className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-16 text-sm text-white placeholder:text-zinc-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-500"
            >
              Buscar
            </button>
          </form>
        </div>
        )}

        {/* Drawer lateral esquerdo: portal com fundo opaco */}
        {typeof document !== "undefined" &&
          drawerOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[100] bg-black/60 sm:hidden"
                aria-hidden
                onClick={closeDrawer}
              />
              <div
                className="fixed left-0 top-0 z-[101] flex h-full w-[var(--drawer-w)] flex-col rounded-r-xl border-r border-zinc-800 bg-black shadow-2xl sm:hidden"
                style={{ "--drawer-w": `${DRAWER_WIDTH}px` } as React.CSSProperties}
                role="dialog"
                aria-label="Menu"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <span className="text-sm font-semibold text-white">Menu</span>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    aria-label="Fechar menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 pb-10">
                  <Link
                    href="/"
                    onClick={closeDrawer}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Início
                  </Link>

                  {/* Produtos: categorias (nível 0) vs subcategorias (nível 1+) com estilo diferente */}
                  {categoryTree.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <span className="mt-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Categorias
                      </span>
                      {categoryTree.map((node) => (
                        <CategoryMenuNode
                          key={node.id}
                          node={node}
                          expandedIds={expandedIds}
                          toggleExpanded={toggleExpanded}
                          closeDrawer={closeDrawer}
                          level={0}
                        />
                      ))}
                    </div>
                  )}

                  {/* Instagram e WhatsApp: só ícones, estilo simples em bolinha */}
                  <div className="mt-3 flex items-center gap-3 border-t border-zinc-800 pt-3">
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[#E4405F] transition hover:bg-zinc-800 hover:text-[#ff5c7a]"
                      aria-label={`Instagram ${SITE_NAME}`}
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                    <a
                      href={
                        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
                          ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vim pelo site da ${SITE_NAME}.`)}`
                          : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] transition hover:bg-[#25D366]/30"
                      aria-label={`WhatsApp ${SITE_NAME}`}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  </div>

                  <div className="mt-4 border-t border-zinc-800 pt-3">
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      Admin
                    </Link>
                    {isAdminLoggedIn && (
                      <button
                        type="button"
                        onClick={handleLogoutStore}
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair (ver como visitante)
                      </button>
                    )}
                  </div>
                </nav>

                <div className="h-[max(0.75rem,env(safe-area-inset-bottom))]" />
              </div>
            </>,
            document.body
          )}
      </div>
    </header>
  );
}

function CategoryMenuNode({
  node,
  expandedIds,
  toggleExpanded,
  closeDrawer,
  level,
}: {
  node: CategoryTreeNode;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  closeDrawer: () => void;
  level: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const href = `/catalogo/${node.path.join("/")}`;
  const isSub = level >= 1;
  const pl = 12 + level * 18;

  const categoryStyle = isSub
    ? "text-xs font-medium text-zinc-400 hover:text-zinc-200"
    : "text-sm font-semibold text-white";

  if (hasChildren) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => toggleExpanded(node.id)}
            className={`flex flex-1 items-center gap-1 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-800 ${categoryStyle}`}
            style={{ paddingLeft: pl }}
          >
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
            {node.name}
          </button>
          <Link
            href={href}
            onClick={closeDrawer}
            className="rounded-lg px-2 py-2.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title="Ver todos"
          >
            Ver todos
          </Link>
        </div>
        {isExpanded && (
          <div className="flex flex-col gap-0.5">
            {node.children.map((child) => (
              <CategoryMenuNode
                key={child.id}
                node={child}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
                closeDrawer={closeDrawer}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={closeDrawer}
      className={`rounded-lg px-3 py-2.5 hover:bg-zinc-800 ${categoryStyle}`}
      style={{ paddingLeft: pl }}
    >
      {node.name}
    </Link>
  );
}
