import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

export const photosRouter = Router();

// Público: lista fotos activas
photosRouter.get("/", async (req, res, next) => {
  try {
    const all = req.query.all === "true";
    const photos = await prisma.photo.findMany({
      where: all ? {} : { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.json({ photos });
  } catch (e) {
    next(e);
  }
});

const schema = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), {
      message: "Host de imagen no permitido",
    }),
  caption: z.string().max(200).transform((s) => sanitizeText(s, 200)).optional().nullable(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

photosRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const photo = await prisma.photo.create({ data });
    res.status(201).json({ photo });
  } catch (e) {
    next(e);
  }
});

photosRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = schema.partial().parse(req.body);
    const photo = await prisma.photo.update({ where: { id }, data });
    res.json({ photo });
  } catch (e) {
    next(e);
  }
});

photosRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.photo.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
