import type { NextConfig } from "next";

const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const config: NextConfig = {
  poweredByHeader: false,
  // 127.0.0.1/localhost cover native local dev. *.localhost covers the
  // platform-VM DevX hostname fleet-frontend-<instance>.localhost, which the
  // API already trusts via ALLOWED_ORIGINS / BETTER_AUTH_URL.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.localhost"],
  async headers() {
    return [{ source: "/(.*)", headers }];
  },
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001";
    return [
      { source: "/api/auth/:path*", destination: `${api}/api/auth/:path*` },
      { source: "/trpc/:path*", destination: `${api}/trpc/:path*` },
    ];
  },
};

export default config;
