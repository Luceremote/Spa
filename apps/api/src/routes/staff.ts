import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

export const staffRouter = Router();

// Público: lista de staff activo (cliente lo ve al reservar)
staffRouter.get("/", async (req, res, next) => {
  try {
    const all = req.query.all === "true";
    const serviceId = req.query.serviceId ? String(req.query.serviceId).slice(0, 50) : undefined;
    const where: any = {};
    if (!all) where.active = true;
    if (serviceId) {
      // Staff que pueden hacer ese servicio (o que pueden todo: sin restricción)
      where.OR = [
        { services: { some: { id: serviceId } } },
        { services: { none: {} } },
      ];
    }
    const staff = await prisma.staff.findMany({
      where,
      include: { services: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ staff });
  } catch (e) {
    next(e);
  }
});

const staffSchema = z.object({
  name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  bio: z.string().max(1000).transform((s) => sanitizeText(s, 1000)).optional().nullable(),
  avatarUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), {
      message: "Host de imagen no permitido",
    })
    .optional()
    .nullable(),
  active: z.boolean().optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  workingFrom: z.number().int().min(0).max(1440).optional(),
  workingTo: z.number().int().min(0).max(1440).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  serviceIds: z.array(z.string().cuid()).max(50).optional(),
});

staffRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = staffSchema.parse(req.body);
    const { serviceIds, ...rest } = data;
    const staff = await prisma.staff.create({
      data: {
        ...rest,
        services: serviceIds?.length
          ? { connect: serviceIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { services: { select: { id: true, name: true } } },
    });
    res.status(201).json({ staff });
  } catch (e) {
    next(e);
  }
});

staffRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = staffSchema.partial().parse(req.body);
    const { serviceIds, ...rest } = data;
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...rest,
        ...(serviceIds !== undefined && {
          services: { set: serviceIds.map((sid) => ({ id: sid })) },
        }),
      },
      include: { services: { select: { id: true, name: true } } },
    });
    res.json({ staff });
  } catch (e) {
    next(e);
  }
});

staffRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    // Verificar que no tenga reservas futuras
    const future = await prisma.booking.count({
      where: {
        staffId: id,
        startAt: { gte: new Date() },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });
    if (future > 0) {
      throw new HttpError(400, `No se puede eliminar: tiene ${future} reservas futuras. Desactívalo en su lugar.`);
    }
    await prisma.staff.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
