import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

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
