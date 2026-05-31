// Cron jobs internos: recordatorios (email 24h + push 1h) + limpieza de SecurityEvent.
import cron from "node-cron";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { sendPush } from "./push.js";
import { sendMail, bookingReminderEmail } from "./mail.js";
import { processRecurringTransactions } from "./finances-helpers.js";

let started = false;

export function startCron() {
  if (started || !env.ENABLE_CRON) return;
  started = true;
  console.log("[cron] iniciando tareas programadas");

  // ─── Push recordatorio: ~REMINDER_MINUTES_BEFORE min antes ──
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + (env.REMINDER_MINUTES_BEFORE - 2) * 60_000);
      const windowEnd = new Date(now.getTime() + (env.REMINDER_MINUTES_BEFORE + 5) * 60_000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          reminderSentAt: null,
          startAt: { gte: windowStart, lte: windowEnd },
        },
        include: { customer: true, service: true },
      });

      if (bookings.length === 0) return;
      console.log(`[cron] push recordatorios: ${bookings.length} reserva(s)`);

      for (const b of bookings) {
        try {
          await sendPush({
            customerIds: [b.customer.id],
            title: "Recordatorio de cita",
            body: `Tu cita "${b.service.name}" es en ~${env.REMINDER_MINUTES_BEFORE} min.`,
            data: { bookingId: b.id, type: "reminder" },
          });
        } catch (e) {
          console.error("[cron] push falló:", e);
        }
        await prisma.booking.update({
          where: { id: b.id },
          data: { reminderSentAt: new Date() },
        });
      }
    } catch (e) {
      console.error("[cron] error push recordatorios:", e);
    }
  });

  // ─── Email recordatorio: 24h antes (cada hora) ──
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      // Ventana 23-25 horas antes
      const windowStart = new Date(now.getTime() + 23 * 60 * 60_000);
      const windowEnd = new Date(now.getTime() + 25 * 60 * 60_000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          emailReminderSentAt: null,
          startAt: { gte: windowStart, lte: windowEnd },
          customer: { email: { not: null } },
        },
        include: { customer: true, service: true },
      });

      if (bookings.length === 0) return;
      console.log(`[cron] email recordatorios: ${bookings.length} reserva(s)`);

      const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
      const spaName = cfg?.spaName ?? "Spa";

      for (const b of bookings) {
        if (!b.customer.email) continue;
        try {
          const m = bookingReminderEmail({
            spaName,
            customerName: b.customer.name,
            customerEmail: b.customer.email,
            customerPhone: b.customer.phone,
            serviceName: b.service.name,
            startAtISO: b.startAt.toISOString(),
            priceCents: b.priceCents,
            bookingId: b.id,
          });
          await sendMail({ to: b.customer.email, ...m });
        } catch (e) {
          console.error("[cron] email recordatorio falló:", e);
        }
        await prisma.booking.update({
          where: { id: b.id },
          data: { emailReminderSentAt: new Date() },
        });
      }
    } catch (e) {
      console.error("[cron] error email recordatorios:", e);
    }
  });

  // ─── Diario 6am: procesar transacciones financieras recurrentes ──
  cron.schedule("0 6 * * *", async () => {
    try {
      const n = await processRecurringTransactions();
      if (n > 0) console.log(`[cron] ${n} recurring transaction(s) created`);
    } catch (e) {
      console.error("[cron] error procesando recurrentes:", e);
    }
  });

  // ─── Diario 3am: borrar SecurityEvent > 90 días ──
  cron.schedule("0 3 * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 86400_000);
      const r = await prisma.securityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (r.count > 0) console.log(`[cron] purgados ${r.count} SecurityEvent`);
    } catch (e) {
      console.error("[cron] error purgando eventos:", e);
    }
  });
}
