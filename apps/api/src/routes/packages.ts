// Paquetes de sesiones de un servicio. Admin define paquetes; cliente los compra vía Stripe.
import { Router, raw } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, normalizeEmail } from "../security/sanitize.js";
import { env } from "../env.js";
import { recordTransaction } from "../finances-helpers.js";

export const packagesRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" as any })
  : null;

// ─── PÚBLICO: listar paquetes activos ──────────────
packagesRouter.get("/", async (_req, res, next) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      where: { active: true, service: { active: true } },
      include: { service: { select: { id: true, name: true, slug: true, durationMinutes: true } } },
      orderBy: [{ serviceId: "asc" }, { priceCents: "asc" }],
    });
    res.json({ packages });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: CRUD paquetes ──────────────────────────
packagesRouter.get("/admin/list", requireAuth, async (_req, res, next) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      include: {
        service: { select: { id: true, name: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ packages });
  } catch (e) {
    next(e);
  }
});

const packageSchema = z.object({
  serviceId: z.string().cuid(),
  name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  sessions: z.number().int().min(1).max(100),
  priceCents: z.number().int().min(100).max(100_000_000),
  validityDays: z.number().int().min(1).max(3650).optional(),
  active: z.boolean().optional(),
});

packagesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = packageSchema.parse(req.body);
    const pkg = await prisma.servicePackage.create({ data });
    res.status(201).json({ package: pkg });
  } catch (e) {
    next(e);
  }
});

packagesRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = packageSchema.partial().parse(req.body);
    const pkg = await prisma.servicePackage.update({ where: { id }, data });
    res.json({ package: pkg });
  } catch (e) {
    next(e);
  }
});

packagesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.servicePackage.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: lista de compras (saldos por cliente) ──
packagesRouter.get("/purchases", requireAuth, async (_req, res, next) => {
  try {
    const purchases = await prisma.packagePurchase.findMany({
      include: {
        package: { include: { service: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    res.json({ purchases });
  } catch (e) {
    next(e);
  }
});

// ─── PÚBLICO: comprar un paquete (crea Stripe Checkout) ──
const buySchema = z.object({
  packageId: z.string().cuid(),
  customerName: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  customerEmail: z.string().email().max(254).transform((s) => normalizeEmail(s)),
  customerPhone: z.string().min(7).max(20),
});

packagesRouter.post("/buy", async (req, res, next) => {
  try {
    if (!stripe) throw new HttpError(503, "Pagos no disponibles");
    const data = buySchema.parse(req.body);
    const phone = data.customerPhone.replace(/\D/g, "").slice(0, 15);

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: data.packageId },
      include: { service: true },
    });
    if (!pkg || !pkg.active) throw new HttpError(404, "Paquete no disponible");

    // Upsert customer por teléfono
    const existing = await prisma.customer.findFirst({ where: { phone } });
    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: { name: data.customerName, email: data.customerEmail },
        })
      : await prisma.customer.create({
          data: { name: data.customerName, email: data.customerEmail, phone },
        });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const purchase = await prisma.packagePurchase.create({
      data: {
        packageId: pkg.id,
        customerId: customer.id,
        sessionsTotal: pkg.sessions,
        sessionsRemaining: pkg.sessions,
        paidCents: pkg.priceCents,
        expiresAt,
        status: "PENDING_PAYMENT",
      },
    });

    const siteConfig = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
    if (siteConfig?.enableBnpl) {
      paymentMethods.push("klarna", "affirm", "afterpay_clearpay");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethods,
      customer_email: data.customerEmail,
      payment_intent_data: {
        description: `Paquete ${pkg.name} — ${pkg.service.name}`,
        metadata: { type: "package", purchaseId: purchase.id, customerId: customer.id },
      },
      line_items: [
        {
          price_data: {
            currency: env.CURRENCY,
            product_data: {
              name: `${pkg.name} (${pkg.sessions} sesiones)`.slice(0, 100),
              description: pkg.service.name.slice(0, 500),
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { type: "package", purchaseId: purchase.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${env.APP_URL}/paquetes/exito?p=${purchase.id}`,
      cancel_url: `${env.APP_URL}/paquetes/cancelado`,
    });

    await prisma.packagePurchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    res.json({ url: session.url, sessionId: session.id, purchaseId: purchase.id });
  } catch (e) {
    next(e);
  }
});

// Helper: activar compra de paquete (idempotente). Llamado desde webhook.
export async function activatePackagePurchase(purchaseId: string, paymentIntentId?: string) {
  const purchase = await prisma.packagePurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return;
  if (purchase.status === "ACTIVE") return; // ya activo, no hacer nada

  await prisma.packagePurchase.update({
    where: { id: purchaseId },
    data: {
      status: "ACTIVE",
      paidAt: new Date(),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });

  // Registrar ingreso en finanzas
  try {
    await recordTransaction({
      type: "INCOME",
      source: "MANUAL",
      amountCents: purchase.paidCents,
      description: `Venta de paquete — compra ${purchase.id}`,
      categoryName: "Paquetes vendidos",
    });
  } catch (e) {
    console.error("[packages] finance record error:", e);
  }
}
