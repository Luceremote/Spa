import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText } from "../security/sanitize.js";

export const staffBlocksRouter = Router();
staffBlocksRouter.use(requireAuth);

// Lista (filtros opcionales)
staffBlocksRouter.get("/", async (req, res, next) => {
  try {
    const staffId = req.query.staffId ? String(req.query.staffId).slice(0, 50) : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : new Date();
    const blocks = await prisma.staffBlock.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        endAt: { gte: from },
      },
      include: { staff: { select: { id: true, name: true } } },
      orderBy: { startAt: "asc" },
    });
    res.json({ blocks });
  } catch (e) {
    next(e);
  }
});

const blockSchema = z.object({
  staffId: z.string().cuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(200).transform((s) => sanitizeText(s, 200)).optional().nullable(),
});

staffBlocksRouter.post("/", async (req, res, next) => {
  try {
    const data = blockSchema.parse(req.body);
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (end <= start) throw new HttpError(400, "El fin debe ser posterior al inicio");

    const block = await prisma.staffBlock.create({
      data: { ...data, startAt: start, endAt: end },
      include: { staff: { select: { id: true, name: true } } },
    });
    res.status(201).json({ block });
  } catch (e) {
    next(e);
  }
});

staffBlocksRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.staffBlock.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
