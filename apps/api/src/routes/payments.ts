import { Router, raw } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { HttpError } from "../middleware/error.js";
import { logSecurityEvent } from "../security/events.js";
import { sendMail, bookingPaidEmail } from "../mail.js";

export const paymentsRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any })
  : null;

const checkoutSchema = z.object({ bookingId: z.string().cuid() });

paymentsRouter.post("/checkout", async (req, res, next) => {
  try {
    if (!stripe) throw new HttpError(500, "Stripe no está configurado");
    const { bookingId } = checkoutSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, customer: true, payment: true },
    });
    if (!booking) throw new HttpError(404, "Reserva no encontrada");
    if (booking.status === "CANCELLED") throw new HttpError(400, "Reserva cancelada");
    if (booking.payment?.status === "PAID") {
      throw new HttpError(400, "Esta reserva ya está pagada");
    }
    // No permitir checkout para reservas pasadas
    if (booking.startAt < new Date()) {
      throw new HttpError(400, "La reserva ya pasó");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: booking.customer.email ?? undefined,
      // Anti-fraud: hint del cliente
      payment_intent_data: {
        description: `Reserva ${booking.id} — ${booking.service.name}`,
        metadata: { bookingId: booking.id, customerId: booking.customer.id },
      },
      line_items: [
        {
          price_data: {
            currency: env.CURRENCY,
            product_data: {
              name: booking.service.name.slice(0, 100),
              description: `Reserva: ${booking.startAt.toISOString()}`.slice(0, 500),
            },
            unit_amount: booking.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { bookingId: booking.id },
      // Expira la sesión a los 30 min
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${env.APP_URL}/reserva/exito?booking=${booking.id}`,
      cancel_url: `${env.APP_URL}/reserva/cancelado?booking=${booking.id}`,
    });

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        stripeSessionId: session.id,
        amountCents: booking.priceCents,
        currency: env.CURRENCY,
        status: "PENDING",
      },
      create: {
        bookingId: booking.id,
        stripeSessionId: session.id,
        amountCents: booking.priceCents,
        currency: env.CURRENCY,
        status: "PENDING",
        method: "STRIPE_CARD",
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    next(e);
  }
});

// Webhook de Stripe — raw body, verificación de firma obligatoria
export const stripeWebhookHandler = [
  raw({ type: "application/json", limit: "1mb" }),
  async (req: any, res: any) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("Webhook no configurado");
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      await logSecurityEvent({ type: "WEBHOOK_INVALID_SIG", req, meta: { reason: "missing" } });
      return res.status(400).send("Firma faltante");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      await logSecurityEvent({
        type: "WEBHOOK_INVALID_SIG",
        req,
        meta: { reason: err?.message ?? "unknown" },
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Idempotencia simple: si el booking ya está PAID, ignora el event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) return res.status(400).send("metadata.bookingId requerido");

        // Verificar que el monto coincida con la DB (anti-tampering)
        const payment = await prisma.payment.findUnique({ where: { bookingId } });
        if (payment && payment.amountCents !== (session.amount_total ?? 0)) {
          await logSecurityEvent({
            type: "WEBHOOK_INVALID_SIG",
            req,
            meta: {
              reason: "amount_mismatch",
              expected: payment.amountCents,
              got: session.amount_total,
              bookingId,
            },
          });
          return res.status(400).send("Monto no coincide");
        }
        if (payment?.status === "PAID") {
          return res.json({ received: true, note: "ya estaba pagado" });
        }

        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { bookingId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ?? null,
            },
          }),
          prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" },
          }),
        ]);
        await logSecurityEvent({ type: "WEBHOOK_OK", req, meta: { event: event.type, bookingId } });

        // Email de "pago confirmado" al cliente
        const fullBooking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { customer: true, service: true },
        });
        const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
        if (fullBooking?.customer.email) {
          const m = bookingPaidEmail({
            spaName: cfg?.spaName ?? "Spa",
            customerName: fullBooking.customer.name,
            customerEmail: fullBooking.customer.email,
            customerPhone: fullBooking.customer.phone,
            serviceName: fullBooking.service.name,
            startAtISO: fullBooking.startAt.toISOString(),
            priceCents: fullBooking.priceCents,
            bookingId: fullBooking.id,
          });
          sendMail({ to: fullBooking.customer.email, ...m });
        }
      } else if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await prisma.payment.updateMany({
            where: { bookingId },
            data: { status: "FAILED" },
          });
        }
      } else if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi) {
          await prisma.payment.updateMany({
            where: { stripePaymentIntentId: pi },
            data: { status: "REFUNDED" },
          });
        }
      }
      res.json({ received: true });
    } catch (e) {
      console.error("Error procesando webhook:", e);
      res.status(500).send("Error interno");
    }
  },
];

paymentsRouter.get("/booking/:bookingId", async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId).slice(0, 50);
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { status: true, amountCents: true, currency: true, paidAt: true, method: true },
    });
    res.json({ payment });
  } catch (e) {
    next(e);
  }
});
