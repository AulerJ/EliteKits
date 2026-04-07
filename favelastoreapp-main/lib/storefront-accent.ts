import { isSecondaryStorefront } from "@/lib/store";

/**
 * Destaque visual: loja principal = verde; vitrine secundária (NEXT_PUBLIC_STORE_SLUG) = ciano.
 */
export function publicStorefrontAccent() {
  const elite = isSecondaryStorefront();
  return {
    elite,
    btn: elite ? "bg-cyan-600 hover:bg-cyan-500" : "bg-green-600 hover:bg-green-500",
    btnSolidRounded: elite
      ? "rounded-xl bg-cyan-600 px-5 py-2.5 font-medium text-white transition hover:bg-cyan-500"
      : "rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white transition hover:bg-green-500",
    price: elite ? "text-cyan-600" : "text-green-600",
    priceLg: elite ? "text-2xl font-bold text-cyan-600" : "text-2xl font-bold text-green-600",
    priceSmBold: elite ? "mt-0.5 text-sm font-bold text-cyan-600" : "mt-0.5 text-sm font-bold text-green-600",
    priceLgSpan: elite ? "mt-auto inline-block text-lg font-bold text-cyan-600" : "mt-auto inline-block text-lg font-bold text-green-600",
    focusInput: elite
      ? "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      : "focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500",
    focusInputRing2: elite
      ? "focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      : "focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20",
    linkStrong: elite
      ? "font-semibold text-cyan-600 underline decoration-cyan-600/50 underline-offset-2 hover:text-cyan-700 hover:decoration-cyan-700"
      : "font-semibold text-green-600 underline decoration-green-600/50 underline-offset-2 hover:text-green-700 hover:decoration-green-700",
    ringCard: elite ? "hover:ring-cyan-300/50" : "hover:ring-green-300/50",
    groupHoverTitle: elite ? "group-hover:text-cyan-600" : "group-hover:text-green-600",
    categoryCardBorder: elite ? "hover:border-cyan-300/70" : "hover:border-green-300/70",
    pillActive: elite
      ? "bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500/30"
      : "bg-green-600 text-white shadow-md ring-2 ring-green-500/30",
    pillInactive: elite
      ? "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200"
      : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200",
    breadcrumbCurrent: elite ? "font-medium text-cyan-700" : "font-medium text-green-700",
    siblingDefaultActive: elite
      ? "bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500/30"
      : "bg-green-600 text-white shadow-md ring-2 ring-green-500/30",
    siblingDefaultInactive: elite
      ? "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-cyan-50 hover:text-cyan-700 hover:ring-cyan-200"
      : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/60 hover:bg-green-50 hover:text-green-700 hover:ring-green-200",
    subcategoryBorderDefault: elite ? "hover:border-cyan-300" : "hover:border-green-300",
    gradientSizeWrap: elite
      ? "rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-500/10 via-white to-amber-500/5 p-8 shadow-sm sm:p-10"
      : "rounded-2xl border border-green-200/60 bg-gradient-to-br from-green-500/10 via-white to-amber-500/5 p-8 shadow-sm sm:p-10",
    gradientSizeTitle: elite
      ? "mb-2 text-center text-base font-medium uppercase tracking-wider text-cyan-700/90"
      : "mb-2 text-center text-base font-medium uppercase tracking-wider text-green-700/90",
    sizeTile: elite
      ? "group flex flex-col items-center justify-center rounded-2xl bg-white py-6 text-lg font-bold text-zinc-800 shadow-md ring-1 ring-zinc-200/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-cyan-400/50 hover:ring-2"
      : "group flex flex-col items-center justify-center rounded-2xl bg-white py-6 text-lg font-bold text-zinc-800 shadow-md ring-1 ring-zinc-200/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-green-400/50 hover:ring-2",
    sizeTileSpan: elite ? "group-hover:text-cyan-600" : "group-hover:text-green-600",
    customOrderLink: elite
      ? "font-semibold text-cyan-600 underline decoration-cyan-600/50 underline-offset-2 hover:text-cyan-700"
      : "font-semibold text-green-600 underline decoration-green-600/50 underline-offset-2 hover:text-green-700",
    customOrderBox: elite
      ? "rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 text-center shadow-sm sm:p-8"
      : "rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 text-center shadow-sm sm:p-8",
    productModalBtn: elite
      ? "flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3.5 font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-500"
      : "flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-600/25 transition hover:bg-green-500",
    outlineBtn: elite
      ? "inline-flex items-center gap-2 rounded-xl border-2 border-cyan-600 bg-white px-5 py-2.5 text-sm font-semibold text-cyan-600 transition hover:bg-cyan-50"
      : "inline-flex items-center gap-2 rounded-xl border-2 border-green-600 bg-white px-5 py-2.5 text-sm font-semibold text-green-600 transition hover:bg-green-50",
    checkbox: elite ? "h-4 w-4 text-cyan-600" : "h-4 w-4 text-green-600",
    totalPrice: elite ? "text-cyan-600" : "text-green-600",
    borderBtn: elite
      ? "mt-3 w-full rounded-xl border border-cyan-600 px-4 py-2.5 text-center text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
      : "mt-3 w-full rounded-xl border border-green-600 px-4 py-2.5 text-center text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60",
    pedidoHeader: elite ? "bg-cyan-600 px-6 py-6 text-center text-white" : "bg-green-600 px-6 py-6 text-center text-white",
    pedidoSub: elite ? "mt-1 text-cyan-100" : "mt-1 text-green-100",
    pedidoMono: elite ? "mt-2 font-mono text-sm text-cyan-200" : "mt-2 font-mono text-sm text-green-200",
    pedidoNote: elite ? "mt-2 text-sm text-cyan-100" : "mt-2 text-sm text-green-100",
    feedbackBox: elite
      ? "rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 text-center shadow-sm sm:p-8"
      : "rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 text-center shadow-sm sm:p-8",
    depoimentosLink: elite ? "mt-6 inline-block text-cyan-600 hover:underline" : "mt-6 inline-block text-green-600 hover:underline",
    shopifyBanner: elite ? "bg-cyan-700 px-4 py-2 text-center text-sm text-white" : "bg-green-700 px-4 py-2 text-center text-sm text-white",
    homeLatestRing: elite ? "hover:ring-cyan-300/50" : "hover:ring-green-300/50",
    homeLatestBtn: elite
      ? "hidden rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-500 sm:inline-flex"
      : "hidden rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-green-500 sm:inline-flex",
    homeLatestBtnMobile: elite
      ? "inline-flex rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-500"
      : "inline-flex rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-500",
    homeLatestPrice: elite ? "mt-2 text-base font-bold text-cyan-600 sm:text-lg" : "mt-2 text-base font-bold text-green-600 sm:text-lg",
    homeLatestSeeAll: elite ? "mt-2 inline-flex text-xs font-semibold text-zinc-700 transition group-hover:text-cyan-600" : "mt-2 inline-flex text-xs font-semibold text-zinc-700 transition group-hover:text-green-600",
    homeEncomendaRing: elite
      ? "block overflow-hidden rounded-2xl shadow-lg ring-1 ring-zinc-200/80 transition hover:ring-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      : "block overflow-hidden rounded-2xl shadow-lg ring-1 ring-zinc-200/80 transition hover:ring-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-500",
    feedbackLightboxRing: elite
      ? "relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-md transition hover:ring-2 hover:ring-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      : "relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-md transition hover:ring-2 hover:ring-green-400 focus:outline-none focus:ring-2 focus:ring-green-500",
    sortSelect: elite
      ? "rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm"
      : "rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20",
    buscaGridBtn: elite
      ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 min-w-0"
      : "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 min-w-0",
    addToCartGrid: elite
      ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500"
      : "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-500",
    addToCartMain: elite
      ? "bg-cyan-600 text-white hover:bg-cyan-500"
      : "bg-green-600 text-white hover:bg-green-500",
    carrinhoBtn: elite
      ? "mt-4 inline-block rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
      : "mt-4 inline-block rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500",
    carrinhoCheckout: elite
      ? "mt-4 flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      : "mt-4 flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60",
    pedidoTotal: elite ? "text-lg font-bold text-cyan-600" : "text-lg font-bold text-green-600",
    pedidoWhatsApp: elite
      ? "flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3.5 font-semibold text-white transition hover:bg-cyan-500"
      : "flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white transition hover:bg-green-500",
  };
}
