// Sentry init. Se llama lo antes posible en el arranque (server.ts).
// Si SENTRY_DSN no está definido, no hace nada (modo desarrollo).
import * as Sentry from "@sentry/node";
import { env } from "./env.js";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!env.SENTRY_DSN) {
    if (env.NODE_ENV === "production") {
      console.warn("[sentry] SENTRY_DSN vacío en prod — no se reportarán errores.");
    }
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // Recortar payloads grandes / PII
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
  });
  initialized = true;
  console.log(`[sentry] inicializado (env=${env.NODE_ENV}, traces=${env.SENTRY_TRACES_SAMPLE_RATE})`);
}

export { Sentry };
