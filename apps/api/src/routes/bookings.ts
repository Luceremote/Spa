import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import {
  sanitizeText,
  sanitizePhoneDigits,
  normalizeEmail,
} from "../security/sanitize.js";
import { sendMail, bookingConfirmationEmail, newBookingAdminEmail } from "../mail.js";
import { env } from "../env.js";
import { evaluateCoupon } from "./coupons.js";

// Valida que una gift card exista, esté activa y tenga al menos algo de saldo
async function evaluateGiftCard(code: string, basePriceCents: number) {
  const c = String(code).trim().toUpperCase().slice(0, 20);
  const card = await prisma.giftCard.findUnique({ where: { code: c } });
  if (!card) return { error: "Gift card no encontrada" as const, card: null };
  if (card.status !== "ACTIVE") return { error: "Gift card no está activa" as const, card: null };
  if (card.expiresAt && card.expiresAt < new Date())
    return { error: "Gift card expirada" as const, card: null };
  if (card.balanceCents <= 0)
    return { error: "Gift card sin saldo" as const, card: null };
  const applied = Math.min(card.balanceCents, basePriceCents);
  return { error: null, card, applied };
}

export const bookingsRouter = Router();

const MIN_LEAD_MINUTES = 30;
const MAX_DAYS_AHEAD = 180;
const OPENING_HOUR = 8;
const CLOSING_HOUR = 21;

// Conflicto: si hay staffId, sólo conflictúa con otras reservas del mismo staff.
// Si NO hay staffId, se compara contra reservas sin staff (recurso "spa global" — opcional, lo aplicamos como
// regla por defecto: si el spa tiene staff, se asume que sólo staff atiende).
async function hasConflict(
  startAt: Date,
  endAt: Date,
  staffId: string | null,
  excludeId?: string
): Promise<boolean> {
  const conflicts = await prisma.booking.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      ...(staffId ? { staffId } : { staffId: null }),
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
    select: { id: true },
  });
  return conflicts.length > 0;
}

async function validateScheduling(startAt: Date, endAt: Date) {
  const now = new Date();
  const minLead = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);
  if (startAt < minLead) {
    throw new HttpError(400, `Debes reservar con al menos ${MIN_LEAD_MINUTES} minutos de antelación`);
  }
  const maxAhead = new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60_000);
  if (startAt > maxAhead) {
    throw new HttpError(400, `No puedes reservar más allá de ${MAX_DAYS_AHEAD} días`);
  }
  if (startAt.getHours() < OPENING_HOUR) {
    throw new HttpError(400, `Horario de atención desde las ${OPENING_HOUR}:00`);
  }
  if (endAt.getHours() > CLOSING_HOUR || (endAt.getHours() === CLOSING_HOUR && endAt.getMinutes() > 0)) {
    throw new HttpError(400, `El servicio debe terminar antes de las ${CLOSING_HOUR}:00`);
  }
  // Día cerrado?
  const dayStart = new Date(startAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const closed = await prisma.closedDate.findUnique({ where: { date: dayStart } });
  if (closed) {
    throw new HttpError(400, `Cerrado ese día${closed.reason ? `: ${closed.reason}` : ""}`);
  }
}

async function validateStaffAvailability(
  staffId: string,
  serviceId: string,
  startAt: Date,
  endAt: Date
) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { services: { select: { id: true } } },
  });
  if (!staff || !staff.active) throw new HttpError(400, "Profesional no disponible");

  // Si tiene servicios asignados, debe incluir éste. Si no tiene, atiende todo.
  if (staff.services.length > 0 && !staff.services.some((s) => s.id === serviceId)) {
    throw new HttpError(400, "Ese profesional no atiende este servicio");
  }
  // Día laboral
  if (!staff.workingDays.includes(startAt.getDay())) {
    throw new HttpError(400, "El profesional no trabaja ese día");
  }
  // Horario laboral
  const startMin = startAt.getHours() * 60 + startAt.getMinutes();
  const endMin = endAt.getHours() * 60 + endAt.getMinutes();
  if (startMin < staff.workingFrom || endMin > staff.workingTo) {
    throw new HttpError(400, "El profesional no atiende a esa hora");
  }
}

const createBookingSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
    phone: z
      .string()
      .min(7)
      .max(20)
      .transform((s) => sanitizePhoneDigits(s))
      .refine((s) => s.length >= 7 && s.length <= 15, {
        message: "Teléfono inválido (entre 7 y 15 dígitos)",
      }),
    email: z.string().email().max(254).transform(normalizeEmail).optional().nullable(),
    notes: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional().nullable(),
  }),
  serviceId: z.string().cuid(),
  staffId: z.string().cuid().optional().nullable(),
  startAt: z.string().datetime(),
  notes: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional().nullable(),
  couponCode: z.string().max(50).optional().nullable(),
  giftCardCode: z.string().max(20).optional().nullable(),
});

bookingsRouter.post("/", async (req, res, next) => {
  try {
    const body = createBookingSchema.parse(req.body);
    const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!service || !service.active) throw new HttpError(400, "Servicio no disponible");

    const startAt = new Date(body.startAt);
    if (isNaN(startAt.getTime())) throw new HttpError(400, "Fecha inválida");
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

    await validateScheduling(startAt, endAt);
    if (body.staffId) {
      await validateStaffAvailability(body.staffId, service.id, startAt, endAt);
    }
    if (await hasConflict(startAt, endAt, body.staffId ?? null)) {
      throw new HttpError(409, "Ese horario ya está reservado");
    }

    // Cupón (si viene)
    const couponEval = body.couponCode
      ? await evaluateCoupon(body.couponCode, service.priceCents)
      : { coupon: null, discountCents: 0, finalCents: service.priceCents };
    if (body.couponCode && couponEval.error) {
      throw new HttpError(400, couponEval.error);
    }

    // Gift card (si viene) — aplica DESPUÉS del cupón al monto ya descontado
    let giftCardApplied = 0;
    let giftCardId: string | null = null;
    if (body.giftCardCode) {
      const gc = await evaluateGiftCard(body.giftCardCode, couponEval.finalCents);
      if (gc.error) throw new HttpError(400, gc.error);
      giftCardApplied = gc.applied!;
      giftCardId = gc.card!.id;
    }
    const finalCentsAfterAll = couponEval.finalCents - giftCardApplied;

    // Cliente: buscar por teléfono o crear (transaccional)
    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { phone: body.customer.phone },
      });
      if (existing) {
        return tx.customer.update({
          where: { id: existing.id },
          data: {
            name: body.customer.name,
            email: body.customer.email ?? existing.email,
          },
        });
      }
      return tx.customer.create({
        data: {
          name: body.customer.name,
          phone: body.customer.phone,
          email: body.customer.email ?? null,
          notes: body.customer.notes ?? null,
        },
      });
    });

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          staffId: body.staffId ?? null,
          startAt,
          endAt,
          basePriceCents: service.priceCents,
          discountCents: couponEval.discountCents + giftCardApplied,
          priceCents: finalCentsAfterAll,
          couponId: couponEval.coupon?.id ?? null,
          notes: body.notes ?? null,
          status: "PENDING",
        },
        include: { service: true, customer: true, staff: true, coupon: true },
      });
      if (couponEval.coupon) {
        await tx.coupon.update({
          where: { id: couponEval.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
      if (giftCardId && giftCardApplied > 0) {
        // Registra el redeem y descuenta el saldo de la gift card
        await tx.giftCardRedemption.create({
          data: { giftCardId, bookingId: b.id, amountCents: giftCardApplied },
        });
        const updated = await tx.giftCard.update({
          where: { id: giftCardId },
          data: { balanceCents: { decrement: giftCardApplied } },
        });
        if (updated.balanceCents <= 0) {
          await tx.giftCard.update({
            where: { id: giftCardId },
            data: { status: "USED_UP" },
          });
        }
      }
      return b;
    });

    // Emails (best-effort)
    const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    const spaName = cfg?.spaName ?? "Spa";
    const mailData = {
      spaName,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone,
      serviceName: booking.service.name,
      startAtISO: booking.startAt.toISOString(),
      priceCents: booking.priceCents,
      bookingId: booking.id,
    };
    if (booking.customer.email) {
      sendMail({ to: booking.customer.email, ...bookingConfirmationEmail(mailData) });
    }
    if (env.ADMIN_EMAIL) {
      sendMail({
        to: env.ADMIN_EMAIL,
        ...newBookingAdminEmail(mailData),
        replyTo: booking.customer.email ?? undefined,
      });
    }

    res.status(201).json({ booking });
  } catch (e) {
    next(e);
  }
});

// Público: disponibilidad de un día (todos o por staff)
bookingsRouter.get("/availability", async (req, res, next) => {
  try {
    const date = String(req.query.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Fecha inválida (YYYY-MM-DD)");
    const staffId = req.query.staffId ? String(req.query.staffId).slice(0, 50) : undefined;
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    if (isNaN(dayStart.getTime())) throw new HttpError(400, "Fecha inválida");

    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startAt: { gte: dayStart, lte: dayEnd },
        ...(staffId ? { staffId } : {}),
      },
      select: { startAt: true, endAt: true, staffId: true },
    });

    // ¿Día cerrado?
    const dayUtc = new Date(`${date}T00:00:00Z`);
    const closed = await prisma.closedDate.findUnique({ where: { date: dayUtc } });

    res.json({ bookings, closed: !!closed, closedReason: closed?.reason ?? null });
  } catch (e) {
    next(e);
  }
});

// Público: consultar mis reservas por teléfono (sin requerir login)
bookingsRouter.get("/lookup", async (req, res, next) => {
  try {
    const phone = sanitizePhoneDigits(String(req.query.phone ?? ""));
    if (phone.length < 7) throw new HttpError(400, "Teléfono inválido");
    const customer = await prisma.customer.findFirst({ where: { phone } });
    if (!customer) return res.json({ bookings: [] });
    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id, startAt: { gte: new Date(Date.now() - 90 * 86400_000) } },
      include: { service: true, staff: true, payment: { select: { status: true, amountCents: true } } },
      orderBy: { startAt: "desc" },
      take: 50,
    });
    res.json({ bookings });
  } catch (e) {
    next(e);
  }
});

// Admin
bookingsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const staffId = req.query.staffId ? String(req.query.staffId) : undefined;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(from || to
          ? { startAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
          : {}),
        ...(status ? { status: status as any } : {}),
        ...(staffId ? { staffId } : {}),
      },
      include: { customer: true, service: true, payment: true, staff: true, coupon: true },
      orderBy: { startAt: "asc" },
      take: 500,
    });
    res.json({ bookings });
  } catch (e) {
    next(e);
  }
});

const updateBookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  startAt: z.string().datetime().optional(),
  staffId: z.string().cuid().nullable().optional(),
  notes: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional().nullable(),
});

bookingsRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = updateBookingSchema.parse(req.body);
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!existing) throw new HttpError(404, "Reserva no encontrada");

    let startAt = existing.startAt;
    let endAt = existing.endAt;
    const newStaffId = data.staffId !== undefined ? data.staffId : existing.staffId;

    if (data.startAt) {
      startAt = new Date(data.startAt);
      endAt = new Date(startAt.getTime() + existing.service.durationMinutes * 60_000);
      await validateScheduling(startAt, endAt);
    }
    if (newStaffId) {
      await validateStaffAvailability(newStaffId, existing.serviceId, startAt, endAt);
    }
    if (data.startAt || data.staffId !== undefined) {
      if (await hasConflict(startAt, endAt, newStaffId, existing.id)) {
        throw new HttpError(409, "Ese horario ya está reservado");
      }
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.staffId !== undefined && { staffId: data.staffId }),
        startAt,
        endAt,
      },
      include: { customer: true, service: true, payment: true, staff: true, coupon: true },
    });
    res.json({ booking });
  } catch (e) {
    next(e);
  }
});

bookingsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.booking.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
