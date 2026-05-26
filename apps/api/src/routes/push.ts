import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { sanitizePhoneDigits } from "../security/sanitize.js";
import { isValidExpoPushToken } from "../push.js";
import { HttpError } from "../middleware/error.js";

export const pushRouter = Router();

// Registro de token (público). Asocia el token al customer por teléfono.
const registerSchema = z.object({
  token: z.string().min(10).max(200),
  phone: z.string().min(7).max(20),
  platform: z.enum(["ios", "android"]).optional(),
});

pushRouter.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (!isValidExpoPushToken(data.token)) {
      throw new HttpError(400, "Token de push inválido");
    }
    const phone = sanitizePhoneDigits(data.phone);
    const customer = await prisma.customer.findFirst({ where: { phone } });
    if (!customer) {
      // Aún sin reservas → guardamos token sin customer; al crear su primera reserva lo enlazamos
      await prisma.pushToken.upsert({
        where: { token: data.token },
        update: { platform: data.platform ?? null },
        create: { token: data.token, platform: data.platform ?? null },
      });
      return res.json({ ok: true, linkedToCustomer: false });
    }
    await prisma.pushToken.upsert({
      where: { token: data.token },
      update: { customerId: customer.id, platform: data.platform ?? null },
      create: { token: data.token, customerId: customer.id, platform: data.platform ?? null },
    });
    res.json({ ok: true, linkedToCustomer: true });
  } catch (e) {
    next(e);
  }
});

pushRouter.post("/unregister", async (req, res, next) => {
  try {
    const token = String(req.body?.token ?? "").slice(0, 200);
    if (token) {
      await prisma.pushToken.deleteMany({ where: { token } });
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
