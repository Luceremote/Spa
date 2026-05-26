import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

export const servicesRouter = Router();

// Público: listar servicios activos
servicesRouter.get("/", async (req, res, next) => {
  try {
    const all = req.query.all === "true";
    const where = all ? {} : { active: true };
    const services = await prisma.service.findMany({
      where,
      include: { category: true },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    res.json({ services });
  } catch (e) {
    next(e);
  }
});

// Público: detalle por slug
servicesRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug).slice(0, 100);
    const service = await prisma.service.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!service) throw new HttpError(404, "Servicio no encontrado");
    res.json({ service });
  } catch (e) {
    next(e);
  }
});

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

const serviceSchema = z.object({
  name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  slug: z.string().min(1).max(100).regex(SLUG_RE, "Slug inválido"),
  description: z.string().min(1).max(2000).transform((s) => sanitizeText(s, 2000)),
  priceCents: z.number().int().nonnegative().max(10_000_000), // $100k tope
  durationMinutes: z.number().int().positive().max(24 * 60),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), {
      message: "El host de la imagen no está permitido. Súbela desde el panel o usa un host permitido.",
    })
    .optional()
    .nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().cuid().optional().nullable(),
});

// Admin: crear
servicesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json({ service });
  } catch (e) {
    next(e);
  }
});

// Admin: actualizar
servicesRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({
      where: { id },
      data,
    });
    res.json({ service });
  } catch (e) {
    next(e);
  }
});

// Admin: eliminar
servicesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.service.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
