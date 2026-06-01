import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA, env } from "../env.js";
import { sendMail } from "../mail.js";

export const marketingRouter = Router();

// ─── BANNER (público + admin) ──────────────────────────────
async function getOrCreateBanner() {
  let b = await prisma.promoBanner.findUnique({ where: { id: "singleton" } });
  if (!b) b = await prisma.promoBanner.create({ data: { id: "singleton" } });
  return b;
}

marketingRouter.get("/banner", async (_req, res, next) => {
  try {
    const banner = await getOrCreateBanner();
    res.json({ banner });
  } catch (e) {
    next(e);
  }
});

const bannerSchema = z.object({
  active: z.boolean().optional(),
  text: z.string().max(280).transform((s) => sanitizeText(s, 280)).optional(),
  ctaLabel: z.string().max(40).optional().nullable(),
  ctaUrl: z.string().max(500).optional().nullable(),
  bgColor: z.string().max(40).optional(),
  textColor: z.string().max(40).optional(),
  dismissible: z.boolean().optional(),
});

marketingRouter.put("/banner", requireAuth, async (req, res, next) => {
  try {
    const data = bannerSchema.parse(req.body);
    await getOrCreateBanner();
    const banner = await prisma.promoBanner.update({
      where: { id: "singleton" },
      data,
    });
    res.json({ banner });
  } catch (e) {
    next(e);
  }
});

// ─── POPUP (público + admin) ──────────────────────────────
async function getOrCreatePopup() {
  let p = await prisma.promoPopup.findUnique({ where: { id: "singleton" } });
  if (!p) p = await prisma.promoPopup.create({ data: { id: "singleton" } });
  return p;
}

marketingRouter.get("/popup", async (_req, res, next) => {
  try {
    const popup = await getOrCreatePopup();
    res.json({ popup });
  } catch (e) {
    next(e);
  }
});

const popupSchema = z.object({
  active: z.boolean().optional(),
  title: z.string().max(120).transform((s) => sanitizeText(s, 120)).optional(),
  body: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional(),
  ctaLabel: z.string().max(40).optional(),
  ctaUrl: z.string().max(500).optional(),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), { message: "Host no permitido" })
    .optional()
    .nullable(),
  showAfterSec: z.number().int().min(0).max(300).optional(),
  showOncePerDays: z.number().int().min(0).max(365).optional(),
});

marketingRouter.put("/popup", requireAuth, async (req, res, next) => {
  try {
    const data = popupSchema.parse(req.body);
    await getOrCreatePopup();
    const popup = await prisma.promoPopup.update({
      where: { id: "singleton" },
      data,
    });
    res.json({ popup });
  } catch (e) {
    next(e);
  }
});

// ─── CAMPAÑAS DE EMAIL ──────────────────────────────────────
marketingRouter.get("/campaigns", requireAuth, async (_req, res, next) => {
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ campaigns });
  } catch (e) {
    next(e);
  }
});

const campaignSchema = z.object({
  subject: z.string().min(1).max(200).transform((s) => sanitizeText(s, 200)),
  preheader: z.string().max(200).transform((s) => sanitizeText(s, 200)).optional().nullable(),
  htmlBody: z.string().min(10).max(100_000), // HTML, no sanitizamos para permitir markup; admin de confianza
});

marketingRouter.post("/campaigns", requireAuth, async (req, res, next) => {
  try {
    const data = campaignSchema.parse(req.body);
    const c = await prisma.emailCampaign.create({ data: { ...data, status: "DRAFT" } });
    res.status(201).json({ campaign: c });
  } catch (e) {
    next(e);
  }
});

marketingRouter.put("/campaigns/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = campaignSchema.partial().parse(req.body);
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Campaña no encontrada");
    if (existing.status === "SENT") throw new HttpError(400, "No se puede editar una campaña ya enviada");
    const c = await prisma.emailCampaign.update({ where: { id }, data });
    res.json({ campaign: c });
  } catch (e) {
    next(e);
  }
});

marketingRouter.delete("/campaigns/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.emailCampaign.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Enviar una campaña a TODOS los suscriptores activos
marketingRouter.post("/campaigns/:id/send", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const camp = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!camp) throw new HttpError(404, "Campaña no encontrada");
    if (camp.status === "SENT") throw new HttpError(400, "Ya fue enviada");

    const subs = await prisma.subscriber.findMany({
      where: { active: true },
      select: { email: true, name: true },
    });
    if (subs.length === 0) throw new HttpError(400, "No hay suscriptores activos");

    await prisma.emailCampaign.update({
      where: { id },
      data: { status: "SENDING", recipientCount: subs.length },
    });

    // Enviar en background (no esperamos)
    (async () => {
      let success = 0;
      let failed = 0;
      const appUrl = env.APP_URL;
      const footer = `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="text-align:center;font-size:11px;color:#999">¿No deseas recibir más mensajes? <a href="${appUrl}/unsubscribe">Cancelar suscripción</a></p>`;
      for (const s of subs) {
        try {
          await sendMail({
            to: s.email,
            subject: camp.subject,
            html: camp.htmlBody + footer,
          });
          success++;
        } catch {
          failed++;
        }
      }
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: failed === subs.length ? "FAILED" : "SENT",
          sentAt: new Date(),
          successCount: success,
          failedCount: failed,
        },
      });
    })().catch(console.error);

    res.json({ ok: true, queued: subs.length });
  } catch (e) {
    next(e);
  }
});

// ─── LOYALTY: settings + balance por cliente + canje ──────
async function getOrCreateLoyaltySettings() {
  let s = await prisma.loyaltySettings.findUnique({ where: { id: "singleton" } });
  if (!s) s = await prisma.loyaltySettings.create({ data: { id: "singleton" } });
  return s;
}

marketingRouter.get("/loyalty/settings", async (_req, res, next) => {
  try {
    const settings = await getOrCreateLoyaltySettings();
    res.json({ settings });
  } catch (e) {
    next(e);
  }
});

const loyaltySettingsSchema = z.object({
  active: z.boolean().optional(),
  pointsPerDollar: z.number().min(0).max(100).optional(),
  pointValueCents: z.number().int().min(0).max(1000).optional(),
  minRedeemPoints: z.number().int().min(0).max(1_000_000).optional(),
});

marketingRouter.put("/loyalty/settings", requireAuth, async (req, res, next) => {
  try {
    const data = loyaltySettingsSchema.parse(req.body);
    await getOrCreateLoyaltySettings();
    const settings = await prisma.loyaltySettings.update({
      where: { id: "singleton" },
      data,
    });
    res.json({ settings });
  } catch (e) {
    next(e);
  }
});

// Consultar balance por teléfono (público)
marketingRouter.get("/loyalty/balance", async (req, res, next) => {
  try {
    const phone = String(req.query.phone ?? "").replace(/\D/g, "").slice(0, 15);
    if (phone.length < 7) throw new HttpError(400, "Teléfono inválido");
    const customer = await prisma.customer.findFirst({
      where: { phone },
      include: { loyaltyAccount: true },
    });
    if (!customer) return res.json({ balance: 0, found: false });
    const acc = customer.loyaltyAccount;
    res.json({
      found: true,
      customerName: customer.name,
      balance: acc?.pointsBalance ?? 0,
      totalEarned: acc?.totalEarned ?? 0,
      totalRedeemed: acc?.totalRedeemed ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

// Admin: lista de cuentas con balance
marketingRouter.get("/loyalty/accounts", requireAuth, async (_req, res, next) => {
  try {
    const accounts = await prisma.loyaltyAccount.findMany({
      include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { pointsBalance: "desc" },
      take: 200,
    });
    res.json({ accounts });
  } catch (e) {
    next(e);
  }
});

// Admin: ajuste manual de puntos
const adjustSchema = z.object({
  customerId: z.string().cuid(),
  points: z.number().int(),
  note: z.string().max(200).optional().nullable(),
});

marketingRouter.post("/loyalty/adjust", requireAuth, async (req, res, next) => {
  try {
    const data = adjustSchema.parse(req.body);
    const acc = await prisma.loyaltyAccount.upsert({
      where: { customerId: data.customerId },
      update: {},
      create: { customerId: data.customerId },
    });
    const newBalance = acc.pointsBalance + data.points;
    if (newBalance < 0) throw new HttpError(400, "Balance negativo no permitido");

    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: acc.id },
        data: {
          pointsBalance: newBalance,
          ...(data.points > 0 ? { totalEarned: { increment: data.points } } : {}),
          ...(data.points < 0 ? { totalRedeemed: { increment: Math.abs(data.points) } } : {}),
        },
      }),
      prisma.loyaltyMovement.create({
        data: {
          accountId: acc.id,
          type: "ADJUSTMENT",
          points: Math.abs(data.points),
          note: data.note ?? null,
        },
      }),
    ]);

    res.json({ ok: true, balance: newBalance });
  } catch (e) {
    next(e);
  }
});
