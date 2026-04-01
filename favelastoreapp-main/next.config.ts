import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    return [
      { source: "/admin/soccer-lover", destination: "/admin/elite-kits", permanent: true },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.mlstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "catalogo.favelastore.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "favelastore.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.favelastore.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "favelastore.site",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.favelastore.site",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "files.stripe.com",
        pathname: "/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
