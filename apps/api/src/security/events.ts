import type { Request } from "express";
import { prisma } from "../db.js";

export type SecurityEventType =
  | "LOGIN_FAILED"
  | "LOGIN_SUCCESS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_UNLOCKED"
  | "TOKEN_INVALID"
  | "RATE_LIMITED"
  | "WEBHOOK_INVALID_SIG"
  | "WEBHOOK_OK"
  | "UPLOAD_REJECTED"
  | "FORBIDDEN_ACCESS";

interface LogParams {
  type: SecurityEventType;
  req?: Request;
  email?: string;
  meta?: Record<string, unknown>;
}

// Extrae IP real respetando reverse-proxies (Vercel, Render, Railway setean x-forwarded-for)
export function clientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0]!.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

// Trunca user-agent para no inflar la DB
function clipUA(ua: string | undefined): string | undefined {
  if (!ua) return undefined;
  return ua.length > 250 ? ua.slice(0, 250) : ua;
}

export async function logSecurityEvent(params: LogParams): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type: params.type,
        email: params.email ?? null,
        ip: params.req ? clientIp(params.req) : null,
        userAgent: clipUA(params.req?.headers["user-agent"] as string | undefined) ?? null,
        meta: (params.meta ?? null) as any,
      },
    });
  } catch (e) {
    // Nunca dejes que un fallo de log tumbe la request
    console.error("[security] no se pudo registrar evento:", e);
  }
}
