const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  // 127.0.0.1/localhost cover native local dev. *.localhost covers the
  // platform-VM DevX hostname fleet-frontend-<instance>.localhost, which the
  // API already trusts via ALLOWED_ORIGINS / BETTER_AUTH_URL.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.localhost"],
  async headers() {
    return [{ source: "/(.*)", headers }];
  },
  // API/auth and tRPC are forwarded by App Router route handlers. Keeping the
  // target out of build-time rewrites lets Dokploy inject API_INTERNAL_URL at
  // runtime instead of baking a localhost fallback into the image.
};

export default config;
