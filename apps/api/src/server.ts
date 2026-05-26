import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { logSecurityEvent } from "./security/events.js";
import { authRouter } from "./routes/auth.js";
import { twoFactorRouter } from "./routes/twofactor.js";
import { servicesRouter } from "./routes/services.js";
import { categoriesRouter } from "./routes/categories.js";
import { bookingsRouter } from "./routes/bookings.js";
import { customersRouter } from "./routes/customers.js";
import { themeRouter } from "./routes/theme.js";
import { siteConfigRouter } from "./routes/siteconfig.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { paymentsRouter, stripeWebhookHandler } from "./routes/payments.js";
import { uploadsRouter, uploadsStatic } from "./routes/uploads.js";
import { staffRouter } from "./routes/staff.js";
import { couponsRouter } from "./routes/coupons.js";
import { closedDatesRouter } from "./routes/closeddates.js";
import { auditRouter } from "./routes/audit.js";
import { exportRouter } from "./routes/export.js";
import { pushRouter } from "./routes/push.js";
import { startCron } from "./cron.js";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", "https://api.stripe.com"],
        "frame-src": ["https://js.stripe.com", "https://hooks.stripe.com"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts:
      env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS bloqueado"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Webhook de Stripe ANTES de express.json() (necesita raw body)
app.post("/api/payments/webhook", ...stripeWebhookHandler);

app.use(express.json({ limit: `${env.MAX_BODY_KB}kb` }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({ type: "RATE_LIMITED", req, meta: { scope: "global" } });
    res.status(429).json({ error: "Demasiadas solicitudes." });
  },
});
app.use("/api", globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip ?? "unknown";
    const email = (req.body?.email ?? "").toString().toLowerCase().slice(0, 254);
    return `${ip}|${email}`;
  },
  handler: async (req, res) => {
    await logSecurityEvent({ type: "RATE_LIMITED", req, meta: { scope: "login" } });
    res.status(429).json({ error: "Demasiados intentos de login. Espera 15 minutos." });
  },
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/2fa/verify", loginLimiter);

app.use(
  "/api/bookings",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/2fa", twoFactorRouter);
app.use("/api/services", servicesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/theme", themeRouter);
app.use("/api/site-config", siteConfigRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/staff", staffRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/closed-dates", closedDatesRouter);
app.use("/api/audit", auditRouter);
app.use("/api/export", exportRouter);
app.use("/api/push", pushRouter);

app.use("/uploads", uploadsStatic);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`🌿 Spa API en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  startCron();
  if (env.NODE_ENV === "production" && !env.STRIPE_WEBHOOK_SECRET) {
    console.warn("[startup] WARN: STRIPE_WEBHOOK_SECRET vacío — los webhooks fallarán.");
  }
});

function shutdown(signal: string) {
  console.log(`\n[${signal}] cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
