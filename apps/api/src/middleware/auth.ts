import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { logSecurityEvent } from "../security/events.js";

const ISSUER = "spa-api";
const AUDIENCE = "spa-clients";

export interface AuthPayload {
  userId: string;
  role: "ADMIN" | "STAFF";
  tv: number; // tokenVersion: si User.tokenVersion cambia, los tokens viejos quedan inválidos
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE,
  } as jwt.SignOptions);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const token = header.slice(7).trim();
  if (token.length < 20 || token.length > 1024) {
    return res.status(401).json({ error: "Token inválido" });
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"], // fija el algoritmo: previene "alg=none" attacks
    }) as AuthPayload;

    // Verificar tokenVersion contra DB (permite revocar todos los tokens de un user)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, lockedUntil: true },
    });
    if (!user || user.tokenVersion !== payload.tv) {
      await logSecurityEvent({ type: "TOKEN_INVALID", req, meta: { userId: payload.userId } });
      return res.status(401).json({ error: "Sesión inválida, vuelve a iniciar sesión" });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ error: "Cuenta temporalmente bloqueada" });
    }

    req.auth = payload;
    next();
  } catch (err: any) {
    await logSecurityEvent({
      type: "TOKEN_INVALID",
      req,
      meta: { reason: err?.name ?? "unknown" },
    });
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRole(...roles: AuthPayload["role"][]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "No autorizado" });
    if (!roles.includes(req.auth.role)) {
      await logSecurityEvent({
        type: "FORBIDDEN_ACCESS",
        req,
        meta: { userId: req.auth.userId, requiredRoles: roles, path: req.path },
      });
      return res.status(403).json({ error: "Permisos insuficientes" });
    }
    next();
  };
}
