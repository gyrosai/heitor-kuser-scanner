// Init do Sentry no browser. No Next 15.3+ com Turbopack este arquivo
// (instrumentation-client.ts) substitui o antigo sentry.client.config.ts.
import * as Sentry from "@sentry/nextjs";
import pkg from "../package.json";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Sem DSN (dev local) não inicializa — Sentry.* vira no-op seguro.
if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    release: pkg.version,
    tracesSampleRate: 0.1,
    // Replay só quando há erro: vemos o que o usuário fez antes de quebrar
    // sem gravar sessões saudáveis.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      // LGPD: as telas mostram dados pessoais de TERCEIROS (nome, telefone,
      // email dos cartões escaneados) + a foto do cartão. O replay grava só a
      // estrutura/cliques/timings — nunca o conteúdo. Pra expor um elemento
      // específico no debug, usar a classe "sentry-unmask" pontualmente.
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],
    beforeSend(event, hint) {
      const original = hint?.originalException;
      // 409 é fluxo normal de duplicata (abre DuplicateModal), não erro.
      if (original instanceof Error && original.name === "ApiConflictError") {
        return null;
      }
      // Ruído de extensões de browser injetadas na página.
      const frames = event.exception?.values?.[0]?.stacktrace?.frames;
      if (
        frames?.some(
          (f) =>
            f.filename?.includes("chrome-extension://") ||
            f.filename?.includes("moz-extension://") ||
            f.filename?.includes("safari-extension://"),
        )
      ) {
        return null;
      }
      return event;
    },
  });

  Sentry.setTag("app_version", pkg.version);
  if (typeof window !== "undefined" && "matchMedia" in window) {
    // true = app instalado (PWA standalone), false = browser
    Sentry.setTag(
      "standalone",
      String(window.matchMedia("(display-mode: standalone)").matches),
    );
  }
  // false = browser antigo caindo no fallback de timeout via AbortController;
  // se aparecer com frequência, sabemos que há usuários em Chrome < 103.
  Sentry.setTag(
    "abortsignal_native",
    String(
      typeof AbortSignal !== "undefined" &&
        typeof AbortSignal.timeout === "function",
    ),
  );
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
