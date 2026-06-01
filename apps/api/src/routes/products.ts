import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

export const productsRouter = Router();
productsRouter.use(requireAuth);

// ───── PRODUCTS ─────
productsRouter.get("/", async (req, res, next) => {
  try {
    const all = req.query.all === "true";
    const lowStock = req.query.lowStock === "true";
    const products = await prisma.product.findMany({
      where: {
        ...(all ? {} : { active: true }),
        ...(lowStock ? { stock: { lte: 5 } } : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    res.json({ products });
  } catch (e) {
    next(e);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!product) throw new HttpError(404, "Producto no encontrado");
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

const productSchema = z.object({
  name: z.string().min(1).max(120).transform((s) => sanitizeText(s, 120)),
  sku: z.string().max(60).optional().nullable(),
  description: z.string().max(2000).transform((s) => sanitizeText(s, 2000)).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  unit: z.string().max(20).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  lowStockAlert: z.number().int().min(0).optional(),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), { message: "Host no permitido" })
    .optional()
    .nullable(),
  active: z.boolean().optional(),
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json({ product });
  } catch (e) {
    next(e);
  }
});

productsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id }, data });
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.product.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ───── MOVIMIENTOS DE STOCK ─────
const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int().positive(),
  unitCostCents: z.number().int().min(0).optional().nullable(),
  note: z.string().max(500).transform((s) => sanitizeText(s, 500)).optional().nullable(),
});

productsRouter.post("/:id/movements", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = movementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Producto no encontrado");

    // Calcular nuevo stock
    let newStock = product.stock;
    if (data.type === "IN") newStock += data.quantity;
    else if (data.type === "OUT") {
      newStock -= data.quantity;
      if (newStock < 0) throw new HttpError(400, `Stock insuficiente. Disponible: ${product.stock}`);
    } else {
      // ADJUSTMENT: quantity es el nuevo valor absoluto
      newStock = data.quantity;
    }

    await prisma.$transaction([
      prisma.productMovement.create({
        data: { productId: id, ...data },
      }),
      prisma.product.update({
        where: { id },
        data: { stock: newStock },
      }),
    ]);

    res.json({ stock: newStock });
  } catch (e) {
    next(e);
  }
});

// Resumen para dashboard
productsRouter.get("/dashboard/summary", async (_req, res, next) => {
  try {
    const [total, lowStock, outOfStock, totalValue] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.product.count({
        where: { active: true, stock: { gt: 0, lte: 5 } },
      }),
      prisma.product.count({ where: { active: true, stock: { lte: 0 } } }),
      prisma.product.findMany({
        where: { active: true, costCents: { not: null } },
        select: { stock: true, costCents: true },
      }),
    ]);

    const inventoryValueCents = totalValue.reduce(
      (sum, p) => sum + p.stock * (p.costCents ?? 0),
      0
    );

    res.json({
      total,
      lowStock,
      outOfStock,
      inventoryValueCents,
    });
  } catch (e) {
    next(e);
  }
});
