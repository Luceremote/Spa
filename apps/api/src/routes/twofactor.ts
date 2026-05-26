import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { prisma } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { logSecurityEvent } from "../security/events.js";
import {
  generateSecret,
  buildOtpAuthUri,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from "../security/totp.js";

export const twoFactorRouter = Router();

// 1) Iniciar setup (devuelve secret + QR data URL)
twoFactorRouter.post("/setup", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new HttpError(404, "Usuario no encontrado");
    if (user.totpEnabled) throw new HttpError(400, "2FA ya está activo. Desactívalo primero.");

    const secret = generateSecret();
    const otpUri = buildOtpAuthUri(secret, user.email, "Spa Admin");
    const qrDataUrl = await QRCode.toDataURL(otpUri);

    // Guardamos el secret cifrado pero aún no marcamos totpEnabled (eso pasa al confirmar)
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret) },
    });

    res.json({
      secret,        // mostrar al usuario como fallback si no puede escanear
      otpUri,
      qrDataUrl,
    });
  } catch (e) {
    next(e);
  }
});

// 2) Confirmar setup con código → marca totpEnabled + genera recovery codes
const confirmSchema = z.object({ token: z.string().regex(/^\d{6}$/) });

twoFactorRouter.post("/confirm", requireAuth, async (req, res, next) => {
  try {
    const { token } = confirmSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user?.totpSecret) throw new HttpError(400, "Inicia primero /2fa/setup");
    if (user.totpEnabled) throw new HttpError(400, "2FA ya está activo");

    const decrypted = decryptSecret(user.totpSecret);
    if (!verifyTotp(token, decrypted)) {
      await logSecurityEvent({ type: "LOGIN_FAILED", req, email: user.email, meta: { stage: "2fa-confirm" } });
      throw new HttpError(401, "Código inválido");
    }

    const recoveryCodes = generateRecoveryCodes(10);
    const recoveryHashes = await hashRecoveryCodes(recoveryCodes);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        recoveryCodes: recoveryHashes,
        // bumpeamos tokenVersion para invalidar sesiones anteriores
        tokenVersion: { increment: 1 },
      },
    });

    // Token nuevo (porque cambió tokenVersion)
    const newToken = signToken({ userId: user.id, role: user.role, tv: user.tokenVersion + 1 });

    res.json({
      ok: true,
      token: newToken,
      recoveryCodes, // ÚNICA VEZ que se devuelven en plano. Guárdalos.
    });
  } catch (e) {
    next(e);
  }
});

// 3) Desactivar 2FA (requiere password actual)
const disableSchema = z.object({ password: z.string().min(1).max(128) });

twoFactorRouter.post("/disable", requireAuth, async (req, res, next) => {
  try {
    const { password } = disableSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new HttpError(404, "Usuario no encontrado");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await logSecurityEvent({ type: "LOGIN_FAILED", req, email: user.email, meta: { stage: "2fa-disable" } });
      throw new HttpError(401, "Contraseña incorrecta");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        recoveryCodes: [],
        tokenVersion: { increment: 1 },
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// 4) Login segunda fase: el endpoint /auth/login con 2FA activo devuelve
//    { challenge: true, challengeToken } y el cliente llama acá con el código.
const loginVerifySchema = z.object({
  challengeToken: z.string().min(10).max(2048),
  token: z.string().regex(/^(\d{6}|[A-Z0-9]{5}-[A-Z0-9]{5})$/, "Código TOTP (6 dígitos) o recovery (XXXXX-XXXXX)"),
});

twoFactorRouter.post("/verify", async (req, res, next) => {
  try {
    const { challengeToken, token } = loginVerifySchema.parse(req.body);
    // El challengeToken es un JWT corto firmado en /auth/login con scope=2fa
    const jwt = await import("jsonwebtoken");
    const { env } = await import("../env.js");
    let payload: any;
    try {
      payload = jwt.verify(challengeToken, env.JWT_SECRET, {
        issuer: "spa-api",
        audience: "spa-2fa",
        algorithms: ["HS256"],
      });
    } catch {
      throw new HttpError(401, "Challenge inválido o expirado");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new HttpError(401, "2FA no configurado");
    }

    let valid = false;
    let updatedRecovery: string[] | null = null;

    if (/^\d{6}$/.test(token)) {
      valid = verifyTotp(token, decryptSecret(user.totpSecret));
    } else {
      const result = await consumeRecoveryCode(token, user.recoveryCodes);
      valid = result.valid;
      if (valid) updatedRecovery = result.remaining;
    }

    if (!valid) {
      await logSecurityEvent({ type: "LOGIN_FAILED", req, email: user.email, meta: { stage: "2fa-verify" } });
      throw new HttpError(401, "Código incorrecto");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(updatedRecovery && { recoveryCodes: updatedRecovery }),
        lastLoginAt: new Date(),
      },
    });
    await logSecurityEvent({ type: "LOGIN_SUCCESS", req, email: user.email, meta: { stage: "2fa" } });

    const fullToken = signToken({ userId: user.id, role: user.role, tv: user.tokenVersion });
    res.json({
      token: fullToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      recoveryRemaining: updatedRecovery?.length ?? user.recoveryCodes.length,
    });
  } catch (e) {
    next(e);
  }
});
