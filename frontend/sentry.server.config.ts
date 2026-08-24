import * as Sentry from "@sentry/nextjs";
import pkg from "./package.json";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    release: pkg.version,
    tracesSampleRate: 0.1,
  });
}
