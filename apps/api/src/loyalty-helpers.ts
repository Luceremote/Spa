// Helpers de programa de lealtad. Se llama desde el flujo de pagos.
import { prisma } from "./db.js";

// Devolver el saldo en cents que cubre una cierta cantidad de puntos
export async function redeemValueCents(points: number): Promise<number> {
  const settings = await prisma.loyaltySettings.findUnique({ where: { id: "singleton" } });
  if (!settings) return 0;
  return points * settings.pointValueCents;
}

// Otorga puntos al cliente cuando un pago de reserva queda confirmado.
// Idempotente: no duplica si ya existe LoyaltyMovement con bookingId+EARN.
export async function earnPointsFromBooking(bookingId: string): Promise<void> {
  try {
    const settings = await prisma.loyaltySettings.findUnique({ where: { id: "singleton" } });
    if (!settings || !settings.active) return;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, customer: true },
    });
    if (!booking || !booking.payment || booking.payment.status !== "PAID") return;

    // Buscar movimiento previo para evitar duplicados
    const acc = await prisma.loyaltyAccount.upsert({
      where: { customerId: booking.customer.id },
      update: {},
      create: { customerId: booking.customer.id },
    });

    const existing = await prisma.loyaltyMovement.findFirst({
      where: { accountId: acc.id, bookingId, type: "EARN" },
    });
    if (existing) return;

    const dollars = booking.payment.amountCents / 100;
    const points = Math.floor(dollars * settings.pointsPerDollar);
    if (points <= 0) return;

    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: acc.id },
        data: {
          pointsBalance: { increment: points },
          totalEarned: { increment: points },
        },
      }),
      prisma.loyaltyMovement.create({
        data: {
          accountId: acc.id,
          type: "EARN",
          points,
          bookingId,
          note: `Reserva ${booking.id}`,
        },
      }),
    ]);
  } catch (e) {
    console.error("[loyalty] earnPointsFromBooking error:", e);
  }
}
