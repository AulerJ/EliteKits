import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Package, ImageIcon, Images, Layout, ShoppingBag, House, Video, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnviewedOrdersCount } from "@/lib/admin/orders";
import { LogoutButton } from "./LogoutButton";
import { AdminSearchForm } from "./AdminSearchForm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const unviewedCount = await getUnviewedOrdersCount();

  return (
    <div className="flex">
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-56 flex flex-col border-r border-zinc-200 bg-white md:flex overflow-y-auto">
        <nav className="space-y-1 flex-1 p-4">
          <Link
            href="/admin/produtos"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Package className="h-5 w-5" />
            Produtos
          </Link>
          <Link
            href="/admin/elite-kits"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Store className="h-5 w-5" />
            EliteKits
          </Link>
          <Link
            href="/admin/vendas"
            className="relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <ShoppingBag className="h-5 w-5" />
            Vendas
            {unviewedCount > 0 && (
              <span
                className="absolute right-3 flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white"
                aria-label={`${unviewedCount} venda${unviewedCount !== 1 ? "s" : ""} não vista${unviewedCount !== 1 ? "s" : ""}`}
              >
                {unviewedCount > 99 ? "99+" : unviewedCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/categorias"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <ImageIcon className="h-5 w-5" />
            Fotos categorias
          </Link>
          <Link
            href="/admin/hero"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Layout className="h-5 w-5" />
            Hero inicial
          </Link>
          <Link
            href="/admin/home"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <House className="h-5 w-5" />
            Home
          </Link>
          <Link
            href="/admin/avaliacoes"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Images className="h-5 w-5" />
            Avalia&ccedil;&otilde;es
          </Link>
          <Link
            href="/admin/tiktok"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-700 transition hover:bg-zinc-100"
          >
            <Video className="h-5 w-5" />
            TikTok Shop
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 space-y-2 border-t border-zinc-200 p-4">
          <LogoutButton />
          <Link
            href="/"
            className="block text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Ver loja
          </Link>
        </div>
      </aside>
      <main className="flex-1 px-4 py-4 md:ml-56 md:px-6 md:py-8">
        {/* Busca rápida - visível em todas as páginas do admin */}
        <div className="mb-4">
          <Suspense fallback={<div className="h-10 max-w-md rounded-xl border border-zinc-200 bg-zinc-50" />}>
            <AdminSearchForm />
          </Suspense>
        </div>
        {/* Navegação compacta para mobile */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-sm font-semibold text-zinc-800">Painel administrativo</span>
          <nav className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/admin/produtos"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Produtos
            </Link>
            <Link
              href="/admin/elite-kits"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              EliteKits
            </Link>
            <Link
              href="/admin/vendas"
              className="relative rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Vendas
              {unviewedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">
                  {unviewedCount > 99 ? "99+" : unviewedCount}
                </span>
              )}
            </Link>
            <Link
              href="/admin/categorias"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Fotos
            </Link>
            <Link
              href="/admin/hero"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Hero
            </Link>
            <Link
              href="/admin/home"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Home
            </Link>
            <Link
              href="/admin/avaliacoes"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Avalia&ccedil;&otilde;es
            </Link>
            <Link
              href="/admin/tiktok"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              TikTok
            </Link>
          </nav>
        </div>
        {children}
      </main>
    </div>
  );
}
