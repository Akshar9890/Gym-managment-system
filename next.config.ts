import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header (security)
  poweredByHeader: false,

  // Tree-shake heavy libraries for faster bundle downloads on mobile
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

