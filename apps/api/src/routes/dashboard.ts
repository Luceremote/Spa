import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// Resumen: ganancias del mes en curso, próximas reservas, totales por estado
dashboardRouter.get("/summary", async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [paidMonth, paidToday, bookingsMonth, upcoming, totalCustomers, byStatus] =
      await Promise.all([
        prisma.payment.aggregate({
          where: {
            status: "PAID",
            paidAt: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amountCents: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            status: "PAID",
            paidAt: { gte: todayStart, lt: todayEnd },
          },
          _sum: { amountCents: true },
        }),
        prisma.booking.count({
          where: { startAt: { gte: monthStart, lt: monthEnd } },
        }),
        prisma.booking.findMany({
          where: {
            startAt: { gte: now },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          include: { service: true, customer: true },
          orderBy: { startAt: "asc" },
          take: 5,
        }),
        prisma.customer.count(),
        prisma.booking.groupBy({
          by: ["status"],
          _count: true,
          where: { startAt: { gte: monthStart, lt: monthEnd } },
        }),
      ]);

    res.json({
      summary: {
        revenueMonthCents: paidMonth._sum.amountCents ?? 0,
        revenueTodayCents: paidToday._sum.amountCents ?? 0,
        paidPaymentsMonth: paidMonth._count,
        bookingsMonth,
        totalCustomers,
        upcoming,
        bookingsByStatus: byStatus,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Serie de ganancias por día del mes en curso (para gráfica)
dashboardRouter.get("/revenue", async (req, res, next) => {
  try {
    const monthsBack = Math.min(12, Number(req.query.monthsBack) || 0);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    const payments = await prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: start } },
      select: { amountCents: true, paidAt: true },
    });

    // Agrupar por YYYY-MM
    const byMonth = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + p.amountCents);
    }

    // Rellenar meses faltantes
    const series: Array<{ month: string; revenueCents: number }> = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      series.push({ month: key, revenueCents: byMonth.get(key) ?? 0 });
    }

    res.json({ series });
  } catch (e) {
    next(e);
  }
});

// Top servicios por reservas y por ingresos
dashboardRouter.get("/top-services", async (_req, res, next) => {
  try {
    const grouped = await prisma.booking.groupBy({
      by: ["serviceId"],
      _count: true,
      _sum: { priceCents: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    });
    const ids = grouped.map((g) => g.serviceId);
    const services = await prisma.service.findMany({ where: { id: { in: ids } } });
    const byId = new Map(services.map((s) => [s.id, s]));
    const top = grouped.map((g) => ({
      service: byId.get(g.serviceId),
      bookings: g._count,
      revenueCents: g._sum.priceCents ?? 0,
    }));
    res.json({ top });
  } catch (e) {
    next(e);
  }
});
