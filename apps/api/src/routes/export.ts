import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const exportRouter = Router();

exportRouter.use(requireAuth);

// Escapado conservador para CSV (RFC 4180): envuelve en comillas y duplica las internas
function csv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Mitigar inyección de fórmulas en Excel/Sheets
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

exportRouter.get("/bookings.csv", async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86400_000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();

    const bookings = await prisma.booking.findMany({
      where: { startAt: { gte: from, lte: to } },
      include: { service: true, customer: true, payment: true, staff: true, coupon: true },
      orderBy: { startAt: "asc" },
      take: 5000,
    });

    const headers = [
      "id",
      "fecha",
      "hora",
      "estado",
      "servicio",
      "duracion_min",
      "profesional",
      "cliente",
      "telefono",
      "email",
      "precio_base_usd",
      "descuento_usd",
      "total_usd",
      "cupon",
      "pago_estado",
      "metodo",
      "pagado_en",
      "notas",
    ];
    const rows = bookings.map((b) =>
      [
        b.id,
        b.startAt.toISOString().slice(0, 10),
        b.startAt.toISOString().slice(11, 16),
        b.status,
        b.service.name,
        b.service.durationMinutes,
        b.staff?.name ?? "",
        b.customer.name,
        b.customer.phone,
        b.customer.email ?? "",
        (b.basePriceCents / 100).toFixed(2),
        (b.discountCents / 100).toFixed(2),
        (b.priceCents / 100).toFixed(2),
        b.coupon?.code ?? "",
        b.payment?.status ?? "",
        b.payment?.method ?? "",
        b.payment?.paidAt?.toISOString() ?? "",
        b.notes ?? "",
      ].map(csv).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bookings_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.csv"`
    );
    // BOM para que Excel detecte UTF-8 con acentos
    res.send("﻿" + csvContent);
  } catch (e) {
    next(e);
  }
});
