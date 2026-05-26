import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole("ADMIN"));

auditRouter.get("/events", async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type).slice(0, 50) : undefined;
    const limit = Math.min(500, Number(req.query.limit) || 100);
    const events = await prisma.securityEvent.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json({ events });
  } catch (e) {
    next(e);
  }
});

auditRouter.get("/summary", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const counts = await prisma.securityEvent.groupBy({
      by: ["type"],
      _count: true,
      where: { createdAt: { gte: since } },
    });
    res.json({ since: since.toISOString(), counts });
  } catch (e) {
    next(e);
  }
});
