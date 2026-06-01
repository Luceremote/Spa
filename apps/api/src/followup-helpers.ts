// Re-engagement: emails a clientes inactivos.
import { prisma } from "./db.js";
import { sendMail, followupEmail } from "./mail.js";
import { env } from "./env.js";

const INACTIVE_DAYS = Number(process.env.FOLLOWUP_INACTIVE_DAYS ?? 60);
const COOLDOWN_DAYS = Number(process.env.FOLLOWUP_COOLDOWN_DAYS ?? 30);
const BATCH_LIMIT = Number(process.env.FOLLOWUP_BATCH_LIMIT ?? 50);

// Devuelve cuántos emails se enviaron.
export async function sendFollowupBatch(): Promise<number> {
  const cutoffInactive = new Date();
  cutoffInactive.setDate(cutoffInactive.getDate() - INACTIVE_DAYS);
  const cutoffCooldown = new Date();
  cutoffCooldown.setDate(cutoffCooldown.getDate() - COOLDOWN_DAYS);

  const candidates = await prisma.customer.findMany({
    where: {
      email: { not: null },
      OR: [{ lastFollowupAt: null }, { lastFollowupAt: { lte: cutoffCooldown } }],
      bookings: {
        none: { startAt: { gte: cutoffInactive } },
      },
      AND: { bookings: { some: {} } },
    },
    take: BATCH_LIMIT,
    include: {
      bookings: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true },
      },
    },
  });

  if (candidates.length === 0) return 0;

  const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });

  let sent = 0;
  for (const c of candidates) {
    if (!c.email) continue;
    const last = c.bookings[0]?.startAt;
    const daysSince = last
      ? Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
      : INACTIVE_DAYS;
    try {
      const tpl = followupEmail({
        spaName: cfg?.spaName ?? "Spa",
        customerName: c.name,
        appUrl: env.APP_URL,
        daysSince,
      });
      await sendMail({ to: c.email, ...tpl });
      await prisma.customer.update({
        where: { id: c.id },
        data: { lastFollowupAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error("[followup] error con cliente", c.id, e);
    }
  }
  return sent;
}
