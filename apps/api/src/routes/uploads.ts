import { Router, type Request, type Response, type NextFunction } from "express";
import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { requireAuth } from "../middleware/auth.js";
import { logSecurityEvent } from "../security/events.js";
import { putImage, isS3 } from "../storage.js";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const LOCAL_DIR = path.resolve(process.cwd(), "uploads");

const SIGS: { ext: string; mime: string; matches: (b: Buffer) => boolean }[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    ext: "webp",
    mime: "image/webp",
    matches: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

function detectSig(buf: Buffer) {
  if (buf.length < 12) return null;
  for (const s of SIGS) {
    if (s.matches(buf)) return s;
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Solo se aceptan JPG, PNG o WebP"));
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/image",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, async (err: any) => {
      if (err) {
        await logSecurityEvent({
          type: "UPLOAD_REJECTED",
          req,
          meta: { reason: err.message ?? "multer_error" },
        });
        return res.status(400).json({ error: err.message ?? "Error subiendo archivo" });
      }
      try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ error: "Archivo requerido (campo 'file')" });

        const sig = detectSig(file.buffer);
        if (!sig) {
          await logSecurityEvent({
            type: "UPLOAD_REJECTED",
            req,
            meta: { reason: "magic_mismatch", declared: file.mimetype },
          });
          return res.status(400).json({ error: "Archivo no es una imagen válida" });
        }

        const key = `${randomBytes(16).toString("hex")}.${sig.ext}`;
        const stored = await putImage(key, file.buffer, sig.mime);
        res.status(201).json({ url: stored.url, size: stored.size, mime: stored.mime });
      } catch (e) {
        next(e);
      }
    });
  }
);

// Subida PÚBLICA acotada para fotos de reseñas (sin auth).
// Defensas: rate limit estricto + mismo sniff de magic bytes + nombre aleatorio.
// Las reseñas quedan sin publicar hasta que el admin las apruebe, así la foto
// nunca se muestra públicamente sin moderación.
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({ type: "RATE_LIMITED", req, meta: { scope: "public_upload" } });
    res.status(429).json({ error: "Demasiadas subidas. Intenta más tarde." });
  },
});

uploadsRouter.post(
  "/review-image",
  publicUploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, async (err: any) => {
      if (err) {
        await logSecurityEvent({
          type: "UPLOAD_REJECTED",
          req,
          meta: { reason: err.message ?? "multer_error", scope: "review" },
        });
        return res.status(400).json({ error: err.message ?? "Error subiendo archivo" });
      }
      try {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ error: "Archivo requerido (campo 'file')" });
        const sig = detectSig(file.buffer);
        if (!sig) {
          await logSecurityEvent({
            type: "UPLOAD_REJECTED",
            req,
            meta: { reason: "magic_mismatch", declared: file.mimetype, scope: "review" },
          });
          return res.status(400).json({ error: "Archivo no es una imagen válida" });
        }
        const key = `review_${randomBytes(16).toString("hex")}.${sig.ext}`;
        const stored = await putImage(key, file.buffer, sig.mime);
        res.status(201).json({ url: stored.url, size: stored.size, mime: stored.mime });
      } catch (e) {
        next(e);
      }
    });
  }
);

// Estático local (sólo cuando STORAGE_DRIVER=local). Cuando S3, las URLs ya son absolutas.
export const uploadsStatic = isS3
  ? (_req: Request, res: Response) => res.status(404).end()
  : express.static(LOCAL_DIR, {
      fallthrough: false,
      index: false,
      maxAge: "7d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
          res.setHeader("Content-Type", "image/jpeg");
        } else if (filePath.endsWith(".png")) {
          res.setHeader("Content-Type", "image/png");
        } else if (filePath.endsWith(".webp")) {
          res.setHeader("Content-Type", "image/webp");
        }
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'");
      },
    });
