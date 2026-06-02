import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText, normalizeEmail } from "../security/sanitize.js";

export const reviewsRouter = Router();

// Público: lista de reseñas aprobadas
reviewsRouter.get("/", async (req, res, next) => {
  try {
    const featured = req.query.featured === "true";
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const reviews = await prisma.review.findMany({
      where: {
        published: true,
        ...(featured ? { featured: true } : {}),
      },
      select: {
        id: true,
        authorName: true,
        rating: true,
        comment: true,
        serviceName: true,
        featured: true,
        response: true,
        respondedAt: true,
        createdAt: true,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    res.json({ reviews });
  } catch (e) {
    next(e);
  }
});

// Público: dejar reseña (queda pendiente de aprobación)
const submitSchema = z.object({
  authorName: z.string().min(2).max(80).transform((s) => sanitizeText(s, 80)),
  authorEmail: z.string().email().max(254).transform(normalizeEmail).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000).transform((s) => sanitizeText(s, 2000)),
  serviceName: z.string().max(120).transform((s) => sanitizeText(s, 120)).optional().nullable(),
});

reviewsRouter.post("/", async (req, res, next) => {
  try {
    const data = submitSchema.parse(req.body);
    const review = await prisma.review.create({
      data: { ...data, published: false, featured: false },
      select: { id: true, authorName: true, rating: true },
    });
    res.status(201).json({
      review,
      message: "¡Gracias por tu reseña! La revisaremos antes de publicarla.",
    });
  } catch (e) {
    next(e);
  }
});

// Admin: lista TODAS (incluye no aprobadas)
reviewsRouter.get("/admin", requireAuth, async (_req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json({ reviews });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  // Respuesta pública del spa. Cadena vacía => quitar respuesta.
  response: z.string().max(1000).transform((s) => sanitizeText(s, 1000)).optional().nullable(),
});

reviewsRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = updateSchema.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (data.published !== undefined) patch.published = data.published;
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.response !== undefined) {
      const trimmed = (data.response ?? "").trim();
      patch.response = trimmed || null;
      patch.respondedAt = trimmed ? new Date() : null;
    }
    const review = await prisma.review.update({ where: { id }, data: patch });
    res.json({ review });
  } catch (e) {
    next(e);
  }
});

reviewsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.review.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Admin: resumen (promedio + total)
reviewsRouter.get("/admin/summary", requireAuth, async (_req, res, next) => {
  try {
    const [agg, byRating] = await Promise.all([
      prisma.review.aggregate({
        where: { published: true },
        _count: true,
        _avg: { rating: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { published: true },
        _count: true,
      }),
    ]);
    res.json({
      total: agg._count,
      avgRating: agg._avg.rating,
      byRating,
    });
  } catch (e) {
    next(e);
  }
});
