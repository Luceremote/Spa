import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const themeRouter = Router();

async function getOrCreateTheme() {
  let theme = await prisma.theme.findUnique({ where: { id: "singleton" } });
  if (!theme) {
    theme = await prisma.theme.create({ data: { id: "singleton" } });
  }
  return theme;
}

themeRouter.get("/", async (_req, res, next) => {
  try {
    const theme = await getOrCreateTheme();
    res.json({ theme });
  } catch (e) {
    next(e);
  }
});

const themeSchema = z.object({
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  colorAccent: z.string().optional(),
  colorBackground: z.string().optional(),
  colorForeground: z.string().optional(),
  colorMuted: z.string().optional(),
  borderRadius: z.string().optional(),
  cardPadding: z.string().optional(),
  containerWidth: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSizeBase: z.string().optional(),
  template: z.enum(["elegant", "modern", "minimal", "luxury"]).optional(),
});

themeRouter.put("/", requireAuth, async (req, res, next) => {
  try {
    const data = themeSchema.parse(req.body);
    await getOrCreateTheme();
    const theme = await prisma.theme.update({
      where: { id: "singleton" },
      data,
    });
    res.json({ theme });
  } catch (e) {
    next(e);
  }
});
