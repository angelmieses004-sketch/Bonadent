import type { NextConfig } from "next";

// Cache Components queda apagado: casi todo el CRM es privado y depende de la sesión,
// así que el renderizado dinámico clásico es más simple y suficiente.
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    // Panorámicas de hasta 25 MB y comprobantes de caja
    serverActions: { bodySizeLimit: "26mb" },
    proxyClientMaxBodySize: "26mb",
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
