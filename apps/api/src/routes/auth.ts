import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { logSecurityEvent, clientIp } from "../security/events.js";
import { normalizeEmail } from "../security/sanitize.js";
import { env } from "../env.js";

export const authRouter = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// Hash dummy para igualar tiempo de respuesta cuando el email no existe (anti-enum/timing)
const DUMMY_HASH = "$2a$12$0000000000000000000000000000000000000000000000000000O";

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const password = parsed.password;

    const user = await prisma.user.findUnique({ where: { email } });

    // Si la cuenta está bloqueada, no procesamos siquiera
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await logSecurityEvent({ type: "ACCOUNT_LOCKED", req, email });
      throw new HttpError(429, "Cuenta bloqueada temporalmente. Intenta más tarde.");
    }

    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !ok) {
      // Incrementar intentos fallidos (solo si el user existe)
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        const data: any = { failedLoginAttempts: attempts };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
          data.failedLoginAttempts = 0;
          await logSecurityEvent({
            type: "ACCOUNT_LOCKED",
            req,
            email,
            meta: { minutes: LOCK_MINUTES },
          });
        }
        await prisma.user.update({ where: { id: user.id }, data });
      }
      await logSecurityEvent({ type: "LOGIN_FAILED", req, email });
      throw new HttpError(401, "Credenciales inválidas");
    }

    // Si tiene 2FA habilitado, NO emitimos token completo; emitimos challenge
    if (user.totpEnabled) {
      const challengeToken = jwt.sign(
        { userId: user.id },
        env.JWT_SECRET,
        { issuer: "spa-api", audience: "spa-2fa", expiresIn: "5m" }
      );
      return res.json({ challenge: true, challengeToken });
    }

    // Login OK (sin 2FA)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp(req),
      },
    });
    await logSecurityEvent({ type: "LOGIN_SUCCESS", req, email });

    const token = signToken({ userId: user.id, role: user.role, tv: user.tokenVersion });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        totpEnabled: true,
        recoveryCodes: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new HttpError(404, "Usuario no encontrado");
    const { recoveryCodes, ...rest } = user;
    res.json({ user: { ...rest, recoveryCount: recoveryCodes.length } });
  } catch (e) {
    next(e);
  }
});

// Logout: invalida TODOS los tokens del usuario subiendo tokenVersion
authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { tokenVersion: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Cambio de contraseña: exige password actual + invalida sesiones anteriores
const changePwdSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Debe incluir mayúscula")
    .regex(/[a-z]/, "Debe incluir minúscula")
    .regex(/\d/, "Debe incluir número"),
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePwdSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new HttpError(404, "Usuario no encontrado");
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      await logSecurityEvent({
        type: "LOGIN_FAILED",
        req,
        email: user.email,
        meta: { action: "change-password" },
      });
      throw new HttpError(401, "Contraseña actual incorrecta");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    res.json({ ok: true, message: "Contraseña actualizada. Vuelve a iniciar sesión." });
  } catch (e) {
    next(e);
  }
});
