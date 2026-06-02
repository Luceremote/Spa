// Lista de espera: el cliente se anota cuando no hay (o no encuentra) cupo.
// Cuando se libera un cupo (cancelación), se avisa a los primeros en la lista.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, sanitizePhoneDigits, normalizeEmail } from "../security/sanitize.js";
import { sendMail, waitlistOpeningEmail } from "../mail.js";
import { env } from "../env.js";

export const waitlistRouter = Router();

// ─── PÚBLICO: anotarse en la lista ─────────────────
const joinSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
    phone: z
      .string()
      .min(7)
      .max(20)
      .transform((s) => sanitizePhoneDigits(s))
      .refine((s) => s.length >= 7 && s.length <= 15, { message: "Teléfono inválido" }),
    email: z.string().email().max(254).transform(normalizeEmail).optional().nullable(),
  }),
  serviceId: z.string().cuid(),
  preferredDate: z.string().optional().nullable(), // YYYY-MM-DD
  note: z.string().max(300).transform((s) => sanitizeText(s, 300)).optional().nullable(),
});

waitlistRouter.post("/", async (req, res, next) => {
  try {
    const data = joinSchema.parse(req.body);
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) throw new HttpError(400, "Servicio no disponible");

    // Cliente: buscar por teléfono o crear
    const found = await prisma.customer.findFirst({ where: { phone: data.customer.phone } });
    const customer = found
      ? await prisma.customer.update({
          where: { id: found.id },
          data: { name: data.customer.name, email: data.customer.email ?? found.email },
        })
      : await prisma.customer.create({
          data: {
            name: data.customer.name,
            phone: data.customer.phone,
            email: data.customer.email ?? null,
          },
        });

    // Evitar duplicados: si ya está esperando este servicio, devolver el existente
    const existing = await prisma.waitlistEntry.findFirst({
      where: { customerId: customer.id, serviceId: service.id, status: { in: ["WAITING", "NOTIFIED"] } },
    });
    if (existing) {
      return res.status(200).json({ entry: existing, alreadyOnList: true });
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        preferredDate: data.preferredDate ? new Date(`${data.preferredDate}T00:00:00Z`) : null,
        note: data.note ?? null,
      },
    });

    res.status(201).json({ entry, alreadyOnList: false });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: listar ─────────────────────────────────
waitlistRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const entries = await prisma.waitlistEntry.findMany({
      where: status ? { status: status as any } : { status: { in: ["WAITING", "NOTIFIED"] } },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    res.json({ entries });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: avisar manualmente a una entrada ───────
waitlistRouter.post("/:id/notify", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id },
      include: { customer: true, service: true },
    });
    if (!entry) throw new HttpError(404, "Entrada no encontrada");
    if (entry.customer.email) {
      const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
      sendMail({
        to: entry.customer.email,
        ...waitlistOpeningEmail({
          spaName: cfg?.spaName ?? "Spa",
          customerName: entry.customer.name,
          serviceName: entry.service.name,
          appUrl: env.APP_URL,
        }),
      });
    }
    await prisma.waitlistEntry.update({
      where: { id },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });
    res.json({ ok: true, hadEmail: !!entry.customer.email });
  } catch (e) {
    next(e);
  }
});

// ─── ADMIN: cambiar estado / eliminar ──────────────
const statusSchema = z.object({
  status: z.enum(["WAITING", "NOTIFIED", "CONVERTED", "CANCELLED"]),
});

waitlistRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const { status } = statusSchema.parse(req.body);
    const entry = await prisma.waitlistEntry.update({ where: { id }, data: { status } });
    res.json({ entry });
  } catch (e) {
    next(e);
  }
});

waitlistRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.waitlistEntry.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Helper: cuando se libera un cupo de un servicio, avisar a los primeros en espera.
// Best-effort, no lanza. Marca como NOTIFIED para no repetir.
export async function notifyWaitlistForService(serviceId: string, max = 3): Promise<void> {
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { serviceId, status: "WAITING", customer: { email: { not: null } } },
      include: { customer: true, service: true },
      orderBy: { createdAt: "asc" },
      take: max,
    });
    if (entries.length === 0) return;
    const cfg = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
    for (const e of entries) {
      if (!e.customer.email) continue;
      await sendMail({
        to: e.customer.email,
        ...waitlistOpeningEmail({
          spaName: cfg?.spaName ?? "Spa",
          customerName: e.customer.name,
          serviceName: e.service.name,
          appUrl: env.APP_URL,
        }),
      });
      await prisma.waitlistEntry.update({
        where: { id: e.id },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });
    }
  } catch (err) {
    console.error("[waitlist] notify error:", err);
  }
}
