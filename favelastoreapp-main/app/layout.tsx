import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { StoreHeader } from "@/components/StoreHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ShopifyInstallBanner } from "@/components/ShopifyInstallBanner";
import { Providers } from "./providers";
import { siteDisplayName } from "@/lib/site-brand";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://favelastore.com";
const brand = siteDisplayName();
const title = `${brand} - Camisas de Time e Acessórios`;
const description = `Catálogo de camisas, óculos, bermudas e mais — ${brand}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  manifest: "/manifest.json",
  openGraph: {
    title: `${brand} - Catálogo`,
    description,
    url: "/",
    siteName: brand,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: brand }],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand} - Catálogo`,
    description,
    images: ["/logo.png"],
  },
  icons: {
    icon: ["/icon-192.png", "/icon-512.png"],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand,
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={dmSans.variable}>
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
        <Providers>
          <StoreHeader />
          <ShopifyInstallBanner />
          {children}
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
