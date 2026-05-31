import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, normalizeEmail } from "../security/sanitize.js";
import { sendMail, giftCardEmail, giftCardReceiptEmail } from "../mail.js";
import { recordGiftCardIncome } from "../finances-helpers.js";

export const giftCardsRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any })
  : null;

// Genera un código legible: XXXX-XXXX-XXXX (12 chars alfanuméricos sin ambigüedades)
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I
  const buf = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[buf[i]! % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const exists = await prisma.giftCard.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("No se pudo generar código único");
}

// ─── Público: consultar saldo de una gift card ──────────────
giftCardsRouter.get("/balance/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code).trim().toUpperCase().slice(0, 20);
    const card = await prisma.giftCard.findUnique({
      where: { code },
      select: {
        code: true,
        balanceCents: true,
        initialCents: true,
        currency: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!card) throw new HttpError(404, "Gift card no encontrada");
    if (card.status !== "ACTIVE") {
      throw new HttpError(400, `Esta gift card no está activa (${card.status})`);
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new HttpError(400, "Gift card expirada");
    }
    res.json({ giftCard: card });
  } catch (e) {
    next(e);
  }
});

// ─── Público: crear sesión de Stripe Checkout para comprar ──
const purchaseSchema = z.object({
  amountCents: z.number().int().min(2000).max(100_000_000), // mínimo $20
  purchaserName: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  purchaserEmail: z.string().email().max(254).transform(normalizeEmail),
  // Si se omiten, el comprador es el destinatario
  recipientName: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)).optional(),
  recipientEmail: z.string().email().max(254).transform(normalizeEmail).optional(),
  message: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional(),
});

giftCardsRouter.post("/purchase", async (req, res, next) => {
  try {
    if (!stripe) throw new HttpError(500, "Stripe no está configurado");
    const data = purchaseSchema.parse(req.body);

    const recipientName = data.recipientName ?? data.purchaserName;
    const recipientEmail = data.recipientEmail ?? data.purchaserEmail;

    const code = await generateUniqueCode();
    const card = await prisma.giftCard.create({
      data: {
        code,
        initialCents: data.amountCents,
        balanceCents: data.amountCents,
        currency: env.CURRENCY,
        status: "PENDING_PAYMENT",
        purchaserName: data.purchaserName,
        purchaserEmail: data.purchaserEmail,
        recipientName,
        recipientEmail,
        message: data.message ?? null,
      },
    });

    const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    const spaName = cfg?.spaName ?? "Spa";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: data.purchaserEmail,
      line_items: [
        {
          price_data: {
            currency: env.CURRENCY,
            product_data: {
              name: `Gift Card ${spaName}`,
              description: `Valor: $${(data.amountCents / 100).toFixed(2)} — para ${recipientName}`,
            },
            unit_amount: data.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { giftCardId: card.id, type: "gift_card" },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${env.APP_URL}/gift-cards/exito?gc=${card.id}`,
      cancel_url: `${env.APP_URL}/gift-cards/cancelado?gc=${card.id}`,
    });

    await prisma.giftCard.update({
      where: { id: card.id },
      data: { stripeSessionId: session.id },
    });

    res.json({ url: session.url, giftCardId: card.id });
  } catch (e) {
    next(e);
  }
});

// Llamado por el webhook de Stripe cuando el pago de la gift card se confirma.
// Activa la card y envía los emails (al destinatario el código, al comprador el recibo).
export async function activateGiftCard(
  giftCardId: string,
  paymentIntentId: string | null
): Promise<void> {
  const card = await prisma.giftCard.findUnique({ where: { id: giftCardId } });
  if (!card) {
    console.error(`[giftcards] activateGiftCard: card ${giftCardId} no encontrada`);
    return;
  }
  if (card.status === "ACTIVE") return; // idempotente

  await prisma.giftCard.update({
    where: { id: giftCardId },
    data: {
      status: "ACTIVE",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    },
  });

  const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  const spaName = cfg?.spaName ?? "Spa";

  const mailData = {
    spaName,
    recipientName: card.recipientName ?? card.purchaserName,
    recipientEmail: card.recipientEmail ?? card.purchaserEmail,
    purchaserName: card.purchaserName,
    amountCents: card.initialCents,
    code: card.code,
    message: card.message,
    appUrl: env.APP_URL,
  };

  // Email al destinatario con el código
  sendMail({ to: mailData.recipientEmail, ...giftCardEmail(mailData) });

  // Recibo al comprador (si es distinto del destinatario o si compra para sí mismo igual)
  if (card.purchaserEmail !== mailData.recipientEmail) {
    sendMail({ to: card.purchaserEmail, ...giftCardReceiptEmail(mailData) });
  }

  // Registrar como ingreso en finanzas (best-effort, idempotente)
  recordGiftCardIncome(giftCardId).catch(() => {});
}

// ─── Admin: listar ──────────────────────────────────────────
giftCardsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const cards = await prisma.giftCard.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
      take: 500,
    });
    res.json({ giftCards: cards });
  } catch (e) {
    next(e);
  }
});

// ─── Admin: actualizar status (cancelar, marcar expirada) ──
const updateSchema = z.object({
  status: z.enum(["ACTIVE", "USED_UP", "EXPIRED", "REFUNDED", "CANCELLED"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

giftCardsRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = updateSchema.parse(req.body);
    const card = await prisma.giftCard.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
      },
    });
    res.json({ giftCard: card });
  } catch (e) {
    next(e);
  }
});
