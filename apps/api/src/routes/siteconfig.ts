import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

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

const urlImage = z
  .string()
  .url()
  .max(2048)
  .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), {
    message: "Host de imagen no permitido",
  });

const urlSocial = z.string().url().max(500).optional().nullable();

const dayHours = z.string().max(50).optional();
const hoursByDaySchema = z
  .object({
    mon: dayHours,
    tue: dayHours,
    wed: dayHours,
    thu: dayHours,
    fri: dayHours,
    sat: dayHours,
    sun: dayHours,
  })
  .optional()
  .nullable();

const configSchema = z.object({
  spaName: z.string().min(1).max(120).optional(),
  tagline: z.string().max(280).optional(),
  logoUrl: urlImage.optional().nullable(),
  heroImageUrl: urlImage.optional().nullable(),
  whatsappPhone: z
    .string()
    .regex(/^\d{7,15}$/, "Solo dígitos, formato internacional sin +")
    .optional(),
  whatsappMsg: z.string().max(500).optional(),
  callPhone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  googleMapsUrl: z.string().url().max(2000).optional().nullable(),
  openingHours: z.string().max(200).optional().nullable(),
  hoursByDay: hoursByDaySchema,
  aboutTitle: z.string().max(120).optional().nullable(),
  aboutText: z.string().max(3000).transform((s) => sanitizeText(s, 3000)).optional().nullable(),
  aboutImageUrl: urlImage.optional().nullable(),
  instagramUrl: urlSocial,
  facebookUrl: urlSocial,
  tiktokUrl: urlSocial,
  twitterUrl: urlSocial,
  youtubeUrl: urlSocial,
  cancellationPolicy: z.string().max(5000).transform((s) => sanitizeText(s, 5000)).optional().nullable(),
  privacyPolicy: z.string().max(20000).transform((s) => sanitizeText(s, 20000)).optional().nullable(),
  termsOfService: z.string().max(20000).transform((s) => sanitizeText(s, 20000)).optional().nullable(),
  enableBnpl: z.boolean().optional(),
  navLinks: z
    .array(
      z.object({
        href: z.string().max(200).transform((s) => sanitizeText(s, 200)),
        label: z.string().min(1).max(40).transform((s) => sanitizeText(s, 40)),
        visible: z.boolean(),
      })
    )
    .max(20)
    .optional()
    .nullable(),
});

siteConfigRouter.put("/", requireAuth, async (req, res, next) => {
  try {
    const data = configSchema.parse(req.body);
    await getOrCreate();
    const config = await prisma.siteConfig.update({
      where: { id: "singleton" },
      data: data as any,
    });
    res.json({ config });
  } catch (e) {
    next(e);
  }
});
