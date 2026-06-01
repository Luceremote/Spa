import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const commissionsRouter = Router();
commissionsRouter.use(requireAuth);

// Calcular comisiones por staff en un periodo
// Sólo cuenta reservas completadas (COMPLETED) y pagadas (Payment.status=PAID)
commissionsRouter.get("/", async (req, res, next) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    const staffList = await prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true, commissionPercent: true, avatarUrl: true },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        startAt: { gte: from, lt: to },
        staffId: { not: null },
        payment: { status: "PAID" },
      },
      include: { service: { select: { name: true } } },
    });

    // Agrupar por staff
    const byStaff = new Map<
      string,
      {
        staff: typeof staffList[number];
        totalRevenue: number;
        commissionCents: number;
        count: number;
      }
    >();

    for (const s of staffList) {
      byStaff.set(s.id, { staff: s, totalRevenue: 0, commissionCents: 0, count: 0 });
    }

    for (const b of bookings) {
      if (!b.staffId) continue;
      const entry = byStaff.get(b.staffId);
      if (!entry) continue;
      const pct = entry.staff.commissionPercent;
      const commission = Math.floor((b.priceCents * pct) / 100);
      entry.totalRevenue += b.priceCents;
      entry.commissionCents += commission;
      entry.count += 1;
    }

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      summary: Array.from(byStaff.values())
        .filter((e) => e.count > 0 || e.staff.commissionPercent > 0)
        .sort((a, b) => b.commissionCents - a.commissionCents),
    });
  } catch (e) {
    next(e);
  }
});

// Detalle de un staff en un periodo (lista de reservas con comisión)
commissionsRouter.get("/:staffId", async (req, res, next) => {
  try {
    const staffId = String(req.params.staffId).slice(0, 50);
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, commissionPercent: true },
    });
    if (!staff) return res.status(404).json({ error: "Staff no encontrado" });

    const bookings = await prisma.booking.findMany({
      where: {
        staffId,
        status: "COMPLETED",
        startAt: { gte: from, lt: to },
        payment: { status: "PAID" },
      },
      include: { service: true, customer: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    });

    const items = bookings.map((b) => ({
      bookingId: b.id,
      date: b.startAt,
      serviceName: b.service.name,
      customerName: b.customer.name,
      priceCents: b.priceCents,
      commissionCents: Math.floor((b.priceCents * staff.commissionPercent) / 100),
    }));

    const totalCommission = items.reduce((s, i) => s + i.commissionCents, 0);
    const totalRevenue = items.reduce((s, i) => s + i.priceCents, 0);

    res.json({
      staff,
      from: from.toISOString(),
      to: to.toISOString(),
      totalRevenue,
      totalCommission,
      items,
    });
  } catch (e) {
    next(e);
  }
});
