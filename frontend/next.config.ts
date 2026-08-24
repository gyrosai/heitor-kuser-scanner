import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      "https://heitor-kuser-scanner-production.up.railway.app";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Upload de sourcemaps só acontece se SENTRY_AUTH_TOKEN existir no build;
  // sem o token o build completa normal, só loga um warning.
  widenClientFileUpload: true,
  // SEM tunnelRoute: é a única opção do withSentryConfig que adiciona rewrites.
  // Eventos vão direto pro DSN; as rewrites /api/* → BACKEND_URL ficam intactas.
});
