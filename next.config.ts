import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: "standalone" on Vercel — it moves .nft.json trace
  // files to a location Vercel's post-build step can't find, causing packaging failure.
  // standalone is only for self-hosted Docker deployments.

  // Disable x-powered-by header (security)
  poweredByHeader: false,

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
