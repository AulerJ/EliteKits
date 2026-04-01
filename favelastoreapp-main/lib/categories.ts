import {
  Package,
  Watch,
  Flag,
  Footprints,
  Sun,
  Key,
  Circle,
  Gem,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80";

// Placeholders do Unsplash - edite para usar suas fotos
const IMAGES: Record<string, string> = {
  bandeira: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  bermuda: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&q=80",
  bikini: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80",
  bone: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80",
  canga: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
  chaveiro: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  cinto: DEFAULT_IMG,
  correntes: DEFAULT_IMG,
  kenner: DEFAULT_IMG,
  tenis: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  relogio: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  pochete: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
  "pulseira-de-pano": DEFAULT_IMG,
};

const ICONS: Record<string, LucideIcon> = {
  bandeira: Flag,
  bermuda: Package,
  bikini: Sun,
  bone: Circle,
  canga: Sun,
  chaveiro: Key,
  cinto: Circle,
  correntes: Gem,
  kenner: ShoppingBag,
  tenis: Footprints,
  relogio: Watch,
  pochete: Wallet,
  "pulseira-de-pano": Circle,
};

export interface CategoryConfig {
  name: string;
  slug: string;
  image: string;
  icon: LucideIcon;
}

// Fallback para o catálogo quando Supabase não está configurado
export const CATEGORIES: CategoryConfig[] = [
  { name: "Bandeira", slug: "bandeira", image: IMAGES.bandeira, icon: Flag },
  { name: "Bermuda", slug: "bermuda", image: IMAGES.bermuda, icon: Package },
  { name: "Bikini", slug: "bikini", image: IMAGES.bikini, icon: Sun },
  { name: "Boné", slug: "bone", image: IMAGES.bone, icon: Circle },
  { name: "Canga", slug: "canga", image: IMAGES.canga, icon: Sun },
  { name: "Chaveiro", slug: "chaveiro", image: IMAGES.chaveiro, icon: Key },
  { name: "Cinto", slug: "cinto", image: IMAGES.cinto, icon: Circle },
  { name: "Correntes", slug: "correntes", image: IMAGES.correntes, icon: Gem },
  { name: "Kenner", slug: "kenner", image: IMAGES.kenner, icon: ShoppingBag },
  { name: "Tênis", slug: "tenis", image: IMAGES.tenis, icon: Footprints },
  { name: "Relógio", slug: "relogio", image: IMAGES.relogio, icon: Watch },
  { name: "Pochete", slug: "pochete", image: IMAGES.pochete, icon: Wallet },
  { name: "Pulseira de Pano", slug: "pulseira-de-pano", image: IMAGES["pulseira-de-pano"], icon: Circle },
];

export function getCategoryConfig(slug: string): { image: string; icon: LucideIcon } {
  return {
    image: IMAGES[slug] ?? DEFAULT_IMG,
    icon: ICONS[slug] ?? Package,
  };
}
