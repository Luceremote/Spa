import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText } from "../security/sanitize.js";

export const closedDatesRouter = Router();

// Público: días cerrados próximos (para que el calendario los pinte como ocupados)
closedDatesRouter.get("/", async (req, res, next) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(from.getTime() + 180 * 24 * 60 * 60 * 1000);

    const closed = await prisma.closedDate.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
    res.json({ closedDates: closed });
  } catch (e) {
    next(e);
  }
});

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  reason: z.string().max(200).transform((s) => sanitizeText(s, 200)).optional().nullable(),
});

closedDatesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const date = new Date(`${data.date}T00:00:00Z`);
    const closed = await prisma.closedDate.upsert({
      where: { date },
      update: { reason: data.reason ?? null },
      create: { date, reason: data.reason ?? null },
    });
    res.status(201).json({ closedDate: closed });
  } catch (e) {
    next(e);
  }
});

closedDatesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.closedDate.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
