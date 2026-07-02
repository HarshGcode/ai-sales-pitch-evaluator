import type { NextConfig } from "next";

// Proxy /api/* to the backend from the frontend's own domain. This is required, not
// just convenient: when frontend and backend live on different domains (e.g. Vercel +
// Railway), a cookie set by a cross-site fetch() is a third-party cookie from the
// browser's point of view — modern Chrome blocks those by default regardless of the
// SameSite=None/Secure attributes. Proxying makes every API call same-origin, so the
// auth cookie is always first-party.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
