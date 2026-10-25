import type { NextConfig } from "next";

// Not: cacheComponents bilinçli olarak kapalı. Uygulama küçük bir ekip için ve her sayfa oturuma bağlı
// (dinamik); klasik render modeli daha basit ve yeterli.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
