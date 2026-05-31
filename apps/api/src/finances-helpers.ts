// Helpers para auto-crear transacciones financieras desde el flujo normal.
// Se llama desde el webhook de Stripe al confirmar pagos y desde gift cards.
import { prisma } from "./db.js";

async function findOrCreateCategory(name: string, type: "INCOME" | "EXPENSE") {
  let cat = await prisma.financeCategory.findUnique({ where: { name_type: { name, type } } });
  if (!cat) {
    cat = await prisma.financeCategory.create({ data: { name, type, isDefault: true } });
  }
  return cat;
}

// Llamar cuando una reserva queda PAID via webhook
export async function recordBookingIncome(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, service: true },
    });
    if (!booking || !booking.payment || booking.payment.status !== "PAID") return;
    if (booking.payment.amountCents <= 0) return;

    // ¿Ya existe Transaction para este booking?
    const existing = await prisma.transaction.findFirst({
      where: { bookingId, source: "BOOKING" },
    });
    if (existing) return;

    const cat = await findOrCreateCategory("Servicios", "INCOME");
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        source: "BOOKING",
        amountCents: booking.payment.amountCents,
        date: booking.payment.paidAt ?? new Date(),
        description: `Pago de reserva: ${booking.service.name}`,
        categoryId: cat.id,
        bookingId: booking.id,
      },
    });
  } catch (e) {
    console.error("[finances] recordBookingIncome error:", e);
  }
}

// Llamar cuando una gift card queda ACTIVE (pagada)
export async function recordGiftCardIncome(giftCardId: string): Promise<void> {
  try {
    const card = await prisma.giftCard.findUnique({ where: { id: giftCardId } });
    if (!card || card.status !== "ACTIVE" || !card.paidAt) return;

    const existing = await prisma.transaction.findFirst({
      where: { giftCardId, source: "GIFT_CARD" },
    });
    if (existing) return;

    const cat = await findOrCreateCategory("Gift Cards", "INCOME");
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        source: "GIFT_CARD",
        amountCents: card.initialCents,
        date: card.paidAt,
        description: `Venta de gift card ${card.code}`,
        categoryId: cat.id,
        giftCardId: card.id,
      },
    });
  } catch (e) {
    console.error("[finances] recordGiftCardIncome error:", e);
  }
}

// Refund: Transaction EXPENSE
export async function recordRefund(paymentIntentId: string): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment) return;

    const existing = await prisma.transaction.findFirst({
      where: { bookingId: payment.bookingId, source: "REFUND" },
    });
    if (existing) return;

    const cat = await findOrCreateCategory("Reembolsos", "EXPENSE");
    await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        source: "REFUND",
        amountCents: payment.amountCents,
        date: new Date(),
        description: `Reembolso pago ${paymentIntentId}`,
        categoryId: cat.id,
        bookingId: payment.bookingId,
      },
    });
  } catch (e) {
    console.error("[finances] recordRefund error:", e);
  }
}

// Cron diario: procesa RecurringTransactions cuya nextDueDate ya pasó
export async function processRecurringTransactions(): Promise<number> {
  const now = new Date();
  const due = await prisma.recurringTransaction.findMany({
    where: { active: true, nextDueDate: { lte: now } },
  });
  if (due.length === 0) return 0;

  let created = 0;
  for (const r of due) {
    try {
      await prisma.transaction.create({
        data: {
          type: r.type,
          source: "RECURRING",
          amountCents: r.amountCents,
          date: r.nextDueDate,
          description: r.name,
          categoryId: r.categoryId,
        },
      });
      created++;
      // Calcular próxima fecha
      const next = computeNextDueDate(r.nextDueDate, r.frequency, {
        dayOfMonth: r.dayOfMonth,
        monthOfYear: r.monthOfYear,
        weekday: r.weekday,
      });
      await prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { nextDueDate: next, lastRunAt: now },
      });
    } catch (e) {
      console.error("[finances] recurring error:", r.id, e);
    }
  }
  return created;
}

function computeNextDueDate(
  from: Date,
  freq: "WEEKLY" | "MONTHLY" | "YEARLY",
  opts: { dayOfMonth: number | null; monthOfYear: number | null; weekday: number | null }
): Date {
  const d = new Date(from);
  if (freq === "WEEKLY") {
    d.setDate(d.getDate() + 7);
  } else if (freq === "MONTHLY") {
    d.setMonth(d.getMonth() + 1);
    if (opts.dayOfMonth) {
      // Asegurar el día (cap si el mes es más corto)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(opts.dayOfMonth, lastDay));
    }
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}
