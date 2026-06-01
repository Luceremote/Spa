import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Sentry } from "../sentry.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Datos inválidos", details: err.flatten() });
  }
  if (err instanceof Error) {
    const status = (err as any).status ?? 500;
    if (status >= 500) {
      console.error(err);
      Sentry.captureException(err);
    }
    return res.status(status).json({ error: err.message || "Error interno" });
  }
  console.error("Error desconocido:", err);
  Sentry.captureException(err);
  res.status(500).json({ error: "Error interno" });
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
