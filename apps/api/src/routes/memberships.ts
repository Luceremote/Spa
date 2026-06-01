// Tiers de membresía + asignación a clientes (gestión manual; sin Stripe Subscriptions).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText } from "../security/sanitize.js";

export const membershipsRouter = Router();

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
