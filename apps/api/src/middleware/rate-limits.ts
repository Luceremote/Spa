// Limitador para endpoints PÚBLICOS de escritura (crear reservas/compras/anotarse).
// Más estricto que el global: frena spam de creación de registros y sesiones de Stripe.
import rateLimit from "express-rate-limit";
import { logSecurityEvent } from "../security/events.js";

export const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({ type: "RATE_LIMITED", req, meta: { scope: "public_write" } });
    res.status(429).json({ error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." });
  },
});
