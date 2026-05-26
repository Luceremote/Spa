import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const siteConfigRouter = Router();

async function getOrCreate() {
  let cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  if (!cfg) cfg = await prisma.siteConfig.create({ data: { id: "singleton" } });
  return cfg;
}

siteConfigRouter.get("/", async (_req, res, next) => {
  try {
    const config = await getOrCreate();
    res.json({ config });
  } catch (e) {
    next(e);
  }
});

const configSchema = z.object({
  spaName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  whatsappPhone: z.string().regex(/^\d{7,15}$/, "Solo dígitos, formato internacional sin +").optional(),
  whatsappMsg: z.string().optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  openingHours: z.string().optional().nullable(),
});

siteConfigRouter.put("/", requireAuth, async (req, res, next) => {
  try {
    const data = configSchema.parse(req.body);
    await getOrCreate();
    const config = await prisma.siteConfig.update({
      where: { id: "singleton" },
      data,
    });
    res.json({ config });
  } catch (e) {
    next(e);
  }
});
