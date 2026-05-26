import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

export const couponsRouter = Router();

// Calcula el descuento aplicable a un monto, validando todas las reglas.
// Si no es válido, devuelve {error}.
export interface CouponEval {
  coupon: { id: string; code: string; type: "PERCENT" | "FIXED"; value: number } | null;
  discountCents: number;
  finalCents: number;
  error?: string;
}

export async function evaluateCoupon(
  code: string,
  basePriceCents: number
): Promise<CouponEval> {
  const normalizedCode = String(code).trim().toUpperCase().slice(0, 50);
  if (!normalizedCode) return { coupon: null, discountCents: 0, finalCents: basePriceCents };

  const c = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  if (!c || !c.active) {
    return { coupon: null, discountCents: 0, finalCents: basePriceCents, error: "Cupón no válido" };
  }
  if (c.expiresAt && c.expiresAt < new Date()) {
    return { coupon: null, discountCents: 0, finalCents: basePriceCents, error: "Cupón expirado" };
  }
  if (c.maxUses !== null && c.usedCount >= c.maxUses) {
    return { coupon: null, discountCents: 0, finalCents: basePriceCents, error: "Cupón agotado" };
  }
  if (c.minPriceCents && basePriceCents < c.minPriceCents) {
    return {
      coupon: null,
      discountCents: 0,
      finalCents: basePriceCents,
      error: `Aplica desde $${(c.minPriceCents / 100).toFixed(2)}`,
    };
  }

  let discountCents = 0;
  if (c.type === "PERCENT") {
    discountCents = Math.floor((basePriceCents * c.value) / 100);
  } else {
    discountCents = Math.min(c.value, basePriceCents); // nunca por debajo de 0
  }
  // Garantizar mínimo $0.50 (límite Stripe) o 0 (gratis)
  const finalCents = basePriceCents - discountCents;
  if (finalCents > 0 && finalCents < 50) {
    return {
      coupon: null,
      discountCents: 0,
      finalCents: basePriceCents,
      error: "El total final es inválido para este cupón",
    };
  }
  return {
    coupon: { id: c.id, code: c.code, type: c.type as any, value: c.value },
    discountCents,
    finalCents,
  };
}

// Público: validar cupón antes de confirmar
const validateSchema = z.object({
  code: z.string().min(1).max(50),
  basePriceCents: z.number().int().nonnegative().max(10_000_000),
});

couponsRouter.post("/validate", async (req, res, next) => {
  try {
    const { code, basePriceCents } = validateSchema.parse(req.body);
    const result = await evaluateCoupon(code, basePriceCents);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Admin
couponsRouter.get("/", requireAuth, async (_req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true } } },
    });
    res.json({ coupons });
  } catch (e) {
    next(e);
  }
});

const couponSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Solo mayúsculas, números, guiones y _")
    .transform((s) => s.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive().max(100_000_000),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  minPriceCents: z.number().int().nonnegative().optional().nullable(),
});

function checkPercentValue(type: string | undefined, value: number | undefined) {
  if (type === "PERCENT" && value !== undefined && (value < 1 || value > 100)) {
    throw new HttpError(400, "Porcentaje entre 1 y 100");
  }
}

couponsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = couponSchema.parse(req.body);
    checkPercentValue(data.type, data.value);
    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
    res.status(201).json({ coupon });
  } catch (e) {
    next(e);
  }
});

couponsRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = couponSchema.partial().parse(req.body);
    checkPercentValue(data.type, data.value);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
      },
    });
    res.json({ coupon });
  } catch (e) {
    next(e);
  }
});

couponsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.coupon.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
