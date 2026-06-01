// Reportes / KPIs para el panel admin. JSON; el frontend renderiza la vista imprimible.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendFollowupBatch } from "../followup-helpers.js";

export const reportsRouter = Router();

// Dispara un lote manual de seguimiento (ignora cooldown sólo si force=true)
reportsRouter.post("/followup/send", requireAuth, async (_req, res, next) => {
  try {
    const sent = await sendFollowupBatch();
    res.json({ sent });
  } catch (e) {
    next(e);
  }
});

const monthlyQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12), // 1-12
});

// Reporte mensual: ingresos, gastos, reservas por estado, top servicios, top staff
reportsRouter.get("/monthly", requireAuth, async (req, res, next) => {
  try {
    const { year, month } = monthlyQuery.parse(req.query);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [income, expense, bookings, byStatus, topServicesRaw, topStaffRaw, prevIncome] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: "INCOME", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { type: "EXPENSE", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.booking.count({ where: { startAt: { gte: start, lt: end } } }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { startAt: { gte: start, lt: end } },
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ["serviceId"],
        where: { startAt: { gte: start, lt: end }, status: { in: ["COMPLETED", "CONFIRMED"] } },
        _count: true,
        _sum: { priceCents: true },
        orderBy: { _count: { serviceId: "desc" } },
        take: 5,
      }),
      prisma.booking.groupBy({
        by: ["staffId"],
        where: {
          startAt: { gte: start, lt: end },
          status: "COMPLETED",
          staffId: { not: null },
        },
        _count: true,
        _sum: { priceCents: true },
        orderBy: { _count: { staffId: "desc" } },
        take: 5,
      }),
      prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          date: {
            gte: new Date(Date.UTC(year, month - 2, 1)),
            lt: start,
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

    // Hidratar IDs
    const serviceIds = topServicesRaw.map((r) => r.serviceId);
    const staffIds = topStaffRaw.map((r) => r.staffId).filter(Boolean) as string[];
    const [services, staff] = await Promise.all([
      serviceIds.length
        ? prisma.service.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      staffIds.length
        ? prisma.staff.findMany({
            where: { id: { in: staffIds } },
            select: { id: true, name: true, commissionPercent: true },
          })
        : Promise.resolve([]),
    ]);

    const topServices = topServicesRaw.map((r) => ({
      service: services.find((s) => s.id === r.serviceId) ?? { id: r.serviceId, name: "(eliminado)" },
      count: r._count,
      revenueCents: r._sum.priceCents ?? 0,
    }));
    const topStaff = topStaffRaw.map((r) => {
      const s = staff.find((x) => x.id === r.staffId);
      const revenue = r._sum.priceCents ?? 0;
      return {
        staff: s ?? { id: r.staffId, name: "(eliminado)", commissionPercent: 0 },
        count: r._count,
        revenueCents: revenue,
        commissionCents: Math.round(revenue * ((s?.commissionPercent ?? 0) / 100)),
      };
    });

    const incomeCents = income._sum.amountCents ?? 0;
    const expenseCents = expense._sum.amountCents ?? 0;

    res.json({
      period: { year, month, start: start.toISOString(), end: end.toISOString() },
      kpis: {
        incomeCents,
        expenseCents,
        balanceCents: incomeCents - expenseCents,
        bookingsTotal: bookings,
        prevIncomeCents: prevIncome._sum.amountCents ?? 0,
        incomeTxCount: income._count,
        expenseTxCount: expense._count,
      },
      byStatus,
      topServices,
      topStaff,
    });
  } catch (e) {
    next(e);
  }
});

// Listado de clientes inactivos para seguimiento manual
const inactiveQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(60),
});

reportsRouter.get("/inactive-customers", requireAuth, async (req, res, next) => {
  try {
    const { days } = inactiveQuery.parse(req.query);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Clientes que NO tienen ninguna reserva después de cutoff
    const customers = await prisma.customer.findMany({
      where: {
        email: { not: null },
        bookings: {
          none: { startAt: { gte: cutoff } },
        },
        // Pero que sí tengan al menos una reserva pasada
        AND: { bookings: { some: {} } },
      },
      include: {
        bookings: {
          orderBy: { startAt: "desc" },
          take: 1,
          select: { startAt: true, status: true },
        },
      },
      take: 300,
    });

    const enriched = customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        lastBookingAt: c.bookings[0]?.startAt.toISOString() ?? null,
        lastFollowupAt: c.lastFollowupAt?.toISOString() ?? null,
        daysSince: c.bookings[0]
          ? Math.floor((Date.now() - c.bookings[0].startAt.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
      .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

    res.json({ customers: enriched });
  } catch (e) {
    next(e);
  }
});
