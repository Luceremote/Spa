import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText } from "../security/sanitize.js";

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const customers = await prisma.customer.findMany({
      where,
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ customers });
  } catch (e) {
    next(e);
  }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          include: { service: true, payment: true },
          orderBy: { startAt: "desc" },
        },
      },
    });
    if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json({ customer });
  } catch (e) {
    next(e);
  }
});

// Actualizar notas privadas y otros campos básicos (admin)
const customerUpdateSchema = z.object({
  privateNotes: z.string().max(5000).transform((s) => sanitizeText(s, 5000)).optional().nullable(),
  notes: z.string().max(1000).transform((s) => sanitizeText(s, 1000)).optional().nullable(),
  name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)).optional(),
  email: z.string().email().max(254).optional().nullable(),
});

customersRouter.put("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = customerUpdateSchema.parse(req.body);
    const customer = await prisma.customer.update({ where: { id }, data });
    res.json({ customer });
  } catch (e) {
    next(e);
  }
});
