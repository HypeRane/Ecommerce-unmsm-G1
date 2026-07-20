import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "idmoda.pe" },
      { protocol: "https", hostname: "images.prismic.io" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "globalpromoitems.com" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "ceproconcontabilidad.unmsm.edu.pe" },
      { protocol: "https", hostname: "promart.vteximg.com.br" },
      // Supabase Storage (avatars e imágenes de productos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // PAYMENTS_API es server-only (no debe exponerse al navegador)
  serverExternalPackages: [],
};

export default nextConfig;
