// Cron jobs internos: recordatorios + limpieza de SecurityEvent.
import cron from "node-cron";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { sendPush } from "./push.js";

let started = false;

export function startCron() {
  if (started || !env.ENABLE_CRON) return;
  started = true;
  console.log("[cron] iniciando tareas programadas");

  // Cada 5 min: enviar recordatorios para reservas que arrancan en ~REMINDER_MINUTES_BEFORE min
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
      console.log(`[cron] recordatorios para ${bookings.length} reserva(s)`);

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
      console.error("[cron] error en recordatorios:", e);
    }
  });

  // Diario 3am: borrar SecurityEvent > 90 días
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
