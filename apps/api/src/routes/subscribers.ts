import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText, normalizeEmail } from "../security/sanitize.js";

export const subscribersRouter = Router();

const subscribeSchema = z.object({
  email: z.string().email().max(254).transform(normalizeEmail),
  name: z.string().max(80).transform((s) => sanitizeText(s, 80)).optional().nullable(),
  source: z.string().max(40).optional(),
});

// Público: suscripción al newsletter
subscribersRouter.post("/", async (req, res, next) => {
  try {
    const data = subscribeSchema.parse(req.body);
    // Upsert: si ya existe, lo reactivamos
    const sub = await prisma.subscriber.upsert({
      where: { email: data.email },
      update: { active: true, unsubscribedAt: null, name: data.name ?? undefined },
      create: { ...data, active: true },
      select: { id: true, email: true },
    });
    res.status(201).json({ subscriber: sub, message: "¡Gracias por suscribirte!" });
  } catch (e) {
    next(e);
  }
});

// Público: darse de baja
subscribersRouter.post("/unsubscribe", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email().transform(normalizeEmail) }).parse(req.body);
    await prisma.subscriber.updateMany({
      where: { email },
      data: { active: false, unsubscribedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Admin
subscribersRouter.get("/", requireAuth, async (_req, res, next) => {
  try {
    const subs = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    res.json({ subscribers: subs });
  } catch (e) {
    next(e);
  }
});

subscribersRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.subscriber.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
