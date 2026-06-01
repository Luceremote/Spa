import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  // JWT_SECRET: largo, alta entropía recomendada (>= 32 caracteres)
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres (genera uno con: openssl rand -base64 48)"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // CORS: lista separada por comas. En prod nunca uses "*".
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Stripe
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  CURRENCY: z.string().length(3).default("usd"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  // Confianza en headers de proxy (1 = un proxy delante, p.ej. Nginx/Cloud Run)
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  // Tamaño máximo de body JSON
  MAX_BODY_KB: z.coerce.number().int().positive().max(10240).default(256),
  // Hosts extra permitidos para URLs de imagen (coma-separados)
  ALLOWED_IMAGE_HOSTS: z.string().default(""),
  // Email (opcional)
  RESEND_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default(""),
  ADMIN_EMAIL: z.string().default(""),
  // Storage: 'local' o 's3' (S3-compatible: AWS, Cloudflare R2, MinIO)
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().default(""),     // ej: https://<account>.r2.cloudflarestorage.com
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default(""),
  S3_ACCESS_KEY: z.string().default(""),
  S3_SECRET_KEY: z.string().default(""),
  S3_PUBLIC_URL: z.string().default(""),   // CDN/dominio público para los archivos
  // 2FA: encrypt-at-rest del TOTP secret. Si vacío, se guarda tal cual (NO RECOMENDADO).
  TOTP_ENCRYPTION_KEY: z.string().default(""),
  // Cron: habilitar tareas programadas (recordatorios, limpieza)
  ENABLE_CRON: z.coerce.boolean().default(true),
  // Recordatorio: cuántos minutos antes de la cita enviarlo
  REMINDER_MINUTES_BEFORE: z.coerce.number().int().positive().default(60),
  // Sentry: si está definido, captura errores y trazas
  SENTRY_DSN: z.string().default(""),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] Error en variables de entorno:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Chequeos extra que zod no captura
const e = parsed.data;
if (e.NODE_ENV === "production") {
  if (e.JWT_SECRET.length < 48) {
    console.warn("[env] WARN: JWT_SECRET corto para producción (recomendado >= 48 chars).");
  }
  if (e.CORS_ORIGIN.includes("*")) {
    console.error("[env] CORS_ORIGIN no puede contener '*' en producción");
    process.exit(1);
  }
  if (!e.STRIPE_SECRET_KEY || !e.STRIPE_WEBHOOK_SECRET) {
    console.warn("[env] WARN: Stripe no está configurado en producción.");
  }
  if (e.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    console.warn("[env] WARN: usando clave de TEST de Stripe en producción.");
  }
}

export const env = parsed.data;

export const ALLOWED_IMAGE_HOSTS_EXTRA = env.ALLOWED_IMAGE_HOSTS
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
