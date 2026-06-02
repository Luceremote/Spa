// Tiers de membresía + asignación manual + suscripción con cobro automático (Stripe).
import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, normalizeEmail, sanitizePhoneDigits } from "../security/sanitize.js";
import { env } from "../env.js";
import { publicWriteLimiter } from "../middleware/rate-limits.js";

export const membershipsRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any })
  : null;

// ─── PÚBLICO: listar tiers activos (para landing) ──
membershipsRouter.get("/tiers", async (_req, res, next) => {
  try {
    const tiers = await prisma.membershipTier.findMany({
      where: { active: true },
      orderBy: { monthlyPriceCents: "asc" },
    });
    res.json({ tiers });
  } catch (e) {
    next(e);
  }
});

// ─── PÚBLICO: mi membresía activa (por teléfono) ──
membershipsRouter.get("/mine", async (req, res, next) => {
  try {
    const phone = String(req.query.phone ?? "").replace(/\D/g, "").slice(0, 15);
    if (phone.length < 7) return res.json({ membership: null });
    const customer = await prisma.customer.findFirst({ where: { phone } });
    if (!customer) return res.json({ membership: null });
    const m = await prisma.customerMembership.findUnique({
      where: { customerId: customer.id },
      include: { tier: { select: { name: true, discountPercent: true, color: true, active: true } } },
    });
    if (!m || !m.active || !m.tier.active || (m.expiresAt && m.expiresAt < new Date())) {
      return res.json({ membership: null });
    }
    res.json({
      membership: {
        tierName: m.tier.name,
        discountPercent: m.tier.discountPercent,
        color: m.tier.color,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: CRUD tiers ─────────────────────────────
membershipsRouter.get("/tiers/admin/list", requireAuth, async (_req, res, next) => {
  try {
    const tiers = await prisma.membershipTier.findMany({
      include: { _count: { select: { memberships: true } } },
      orderBy: { monthlyPriceCents: "asc" },
    });
    res.json({ tiers });
  } catch (e) {
    next(e);
  }
});

const tierSchema = z.object({
  name: z.string().min(1).max(60).transform((s) => sanitizeText(s, 60)),
  description: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional().nullable(),
  monthlyPriceCents: z.number().int().min(0).max(100_000_000),
  discountPercent: z.number().min(0).max(100),
  perks: z.string().max(2000).transform((s) => sanitizeText(s, 2000)).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  active: z.boolean().optional(),
});

membershipsRouter.post("/tiers", requireAuth, async (req, res, next) => {
  try {
    const data = tierSchema.parse(req.body);
    const tier = await prisma.membershipTier.create({ data });
    res.status(201).json({ tier });
  } catch (e) {
    next(e);
  }
});

membershipsRouter.put("/tiers/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = tierSchema.partial().parse(req.body);
    const tier = await prisma.membershipTier.update({ where: { id }, data });
    res.json({ tier });
  } catch (e) {
    next(e);
  }
});

membershipsRouter.delete("/tiers/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.membershipTier.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: lista de clientes con membresía activa ──
membershipsRouter.get("/customers", requireAuth, async (_req, res, next) => {
  try {
    const memberships = await prisma.customerMembership.findMany({
      include: {
        tier: { select: { id: true, name: true, color: true, discountPercent: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 300,
    });
    res.json({ memberships });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: asignar / actualizar membresía a un cliente ──
const assignSchema = z.object({
  customerId: z.string().cuid(),
  tierId: z.string().cuid(),
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

membershipsRouter.post("/assign", requireAuth, async (req, res, next) => {
  try {
    const data = assignSchema.parse(req.body);
    const existing = await prisma.customerMembership.findUnique({
      where: { customerId: data.customerId },
    });
    const expires = data.expiresAt ? new Date(data.expiresAt) : null;
    const membership = existing
      ? await prisma.customerMembership.update({
          where: { customerId: data.customerId },
          data: {
            tierId: data.tierId,
            expiresAt: expires,
            note: data.note ?? null,
            active: true,
          },
        })
      : await prisma.customerMembership.create({
          data: {
            customerId: data.customerId,
            tierId: data.tierId,
            expiresAt: expires,
            note: data.note ?? null,
          },
        });
    res.json({ membership });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: cancelar membresía ─────────────────────
membershipsRouter.delete("/customers/:customerId", requireAuth, async (req, res, next) => {
  try {
    const customerId = String(req.params.customerId).slice(0, 50);
    await prisma.customerMembership.delete({ where: { customerId } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ─── PÚBLICO: suscribirse a un tier (cobro mensual automático vía Stripe) ──
const subscribeSchema = z.object({
  tierId: z.string().cuid(),
  customer: z.object({
    name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
    phone: z
      .string()
      .min(7)
      .max(20)
      .transform((s) => sanitizePhoneDigits(s))
      .refine((s) => s.length >= 7 && s.length <= 15, { message: "Teléfono inválido" }),
    email: z.string().email().max(254).transform(normalizeEmail),
  }),
});

membershipsRouter.post("/subscribe", publicWriteLimiter, async (req, res, next) => {
  try {
    if (!stripe) throw new HttpError(503, "Pagos no disponibles");
    const data = subscribeSchema.parse(req.body);
    const tier = await prisma.membershipTier.findUnique({ where: { id: data.tierId } });
    if (!tier || !tier.active) throw new HttpError(404, "Membresía no disponible");
    if (tier.monthlyPriceCents <= 0) throw new HttpError(400, "Este plan no es de cobro online");

    // Cliente: buscar por teléfono o crear
    const found = await prisma.customer.findFirst({ where: { phone: data.customer.phone } });
    const customer = found
      ? await prisma.customer.update({
          where: { id: found.id },
          data: { name: data.customer.name, email: data.customer.email },
        })
      : await prisma.customer.create({
          data: {
            name: data.customer.name,
            phone: data.customer.phone,
            email: data.customer.email,
          },
        });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: data.customer.email,
      line_items: [
        {
          price_data: {
            currency: env.CURRENCY,
            product_data: { name: `Membresía ${tier.name}`.slice(0, 100) },
            unit_amount: tier.monthlyPriceCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { type: "membership", customerId: customer.id, tierId: tier.id },
      },
      metadata: { type: "membership", customerId: customer.id, tierId: tier.id },
      success_url: `${env.APP_URL}/membresias/exito`,
      cancel_url: `${env.APP_URL}/membresias`,
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

// ─── PÚBLICO: portal de gestión de suscripción (cancelar, cambiar tarjeta) ──
membershipsRouter.post("/portal", async (req, res, next) => {
  try {
    if (!stripe) throw new HttpError(503, "Pagos no disponibles");
    const phone = sanitizePhoneDigits(String(req.body?.phone ?? ""));
    if (phone.length < 7) throw new HttpError(400, "Teléfono inválido");
    const customer = await prisma.customer.findFirst({ where: { phone } });
    const membership = customer
      ? await prisma.customerMembership.findUnique({ where: { customerId: customer.id } })
      : null;
    if (!membership?.stripeCustomerId) {
      throw new HttpError(404, "No encontramos una suscripción con ese teléfono");
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: `${env.APP_URL}/membresias`,
    });
    res.json({ url: portal.url });
  } catch (e) {
    next(e);
  }
});

// Aplica el estado de una suscripción de Stripe a la membresía del cliente.
// Idempotente. Llamado desde el webhook.
export async function applyMembershipSubscription(args: {
  customerId: string;
  tierId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodEnd: number | null; // epoch seconds
}): Promise<void> {
  const active = ["active", "trialing", "past_due"].includes(args.status);
  const expiresAt = args.currentPeriodEnd ? new Date(args.currentPeriodEnd * 1000) : null;
  await prisma.customerMembership.upsert({
    where: { customerId: args.customerId },
    update: {
      tierId: args.tierId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      stripeStatus: args.status,
      active,
      expiresAt,
    },
    create: {
      customerId: args.customerId,
      tierId: args.tierId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      stripeStatus: args.status,
      active,
      expiresAt,
    },
  });
}

// Marca una suscripción como cancelada (por subscription.deleted).
export async function cancelMembershipSubscription(stripeSubscriptionId: string): Promise<void> {
  await prisma.customerMembership.updateMany({
    where: { stripeSubscriptionId },
    data: { active: false, stripeStatus: "canceled" },
  });
}

// ─── Helper: obtener descuento activo de un cliente (% sobre precio) ──
export async function getActiveDiscountForCustomer(customerId: string): Promise<number> {
  const m = await prisma.customerMembership.findUnique({
    where: { customerId },
    include: { tier: true },
  });
  if (!m || !m.active) return 0;
  if (m.expiresAt && m.expiresAt < new Date()) return 0;
  if (!m.tier.active) return 0;
  return m.tier.discountPercent;
}
