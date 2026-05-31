import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sanitizeText, isAllowedImageUrl } from "../security/sanitize.js";
import { ALLOWED_IMAGE_HOSTS_EXTRA } from "../env.js";

export const financesRouter = Router();

// Todo este router es solo admin
financesRouter.use(requireAuth);

// ───────── CATEGORIES ─────────
financesRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.financeCategory.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    });
    res.json({ categories });
  } catch (e) {
    next(e);
  }
});

const categorySchema = z.object({
  name: z.string().min(1).max(60).transform((s) => sanitizeText(s, 60)),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
});

financesRouter.post("/categories", async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.financeCategory.create({ data });
    res.status(201).json({ category });
  } catch (e) {
    next(e);
  }
});

financesRouter.put("/categories/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.financeCategory.update({ where: { id }, data });
    res.json({ category });
  } catch (e) {
    next(e);
  }
});

financesRouter.delete("/categories/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.financeCategory.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ───────── TRANSACTIONS ─────────
financesRouter.get("/transactions", async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
    const q = req.query.q ? String(req.query.q).slice(0, 100) : undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(from || to ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
        ...(type ? { type: type as any } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { description: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 1000,
    });
    res.json({ transactions });
  } catch (e) {
    next(e);
  }
});

const txSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amountCents: z.number().int().positive().max(1_000_000_000),
  date: z.string().datetime(),
  description: z.string().max(200).transform((s) => sanitizeText(s, 200)).optional().nullable(),
  note: z.string().max(1000).transform((s) => sanitizeText(s, 1000)).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  receiptUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => isAllowedImageUrl(u, ALLOWED_IMAGE_HOSTS_EXTRA), { message: "Host no permitido" })
    .optional()
    .nullable(),
});

financesRouter.post("/transactions", async (req, res, next) => {
  try {
    const data = txSchema.parse(req.body);
    const transaction = await prisma.transaction.create({
      data: { ...data, date: new Date(data.date), source: "MANUAL" },
      include: { category: true },
    });
    res.status(201).json({ transaction });
  } catch (e) {
    next(e);
  }
});

financesRouter.put("/transactions/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = txSchema.partial().parse(req.body);
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        ...(data.date && { date: new Date(data.date) }),
      },
      include: { category: true },
    });
    res.json({ transaction });
  } catch (e) {
    next(e);
  }
});

financesRouter.delete("/transactions/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.transaction.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ───────── RECURRING ─────────
financesRouter.get("/recurring", async (_req, res, next) => {
  try {
    const list = await prisma.recurringTransaction.findMany({
      include: { category: true },
      orderBy: { nextDueDate: "asc" },
    });
    res.json({ recurring: list });
  } catch (e) {
    next(e);
  }
});

const recurSchema = z.object({
  name: z.string().min(1).max(80).transform((s) => sanitizeText(s, 80)),
  amountCents: z.number().int().positive().max(1_000_000_000),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().cuid().optional().nullable(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  active: z.boolean().optional(),
  nextDueDate: z.string().datetime(),
});

financesRouter.post("/recurring", async (req, res, next) => {
  try {
    const data = recurSchema.parse(req.body);
    const r = await prisma.recurringTransaction.create({
      data: { ...data, nextDueDate: new Date(data.nextDueDate) },
      include: { category: true },
    });
    res.status(201).json({ recurring: r });
  } catch (e) {
    next(e);
  }
});

financesRouter.put("/recurring/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    const data = recurSchema.partial().parse(req.body);
    const r = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...data,
        ...(data.nextDueDate && { nextDueDate: new Date(data.nextDueDate) }),
      },
      include: { category: true },
    });
    res.json({ recurring: r });
  } catch (e) {
    next(e);
  }
});

financesRouter.delete("/recurring/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id).slice(0, 50);
    await prisma.recurringTransaction.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ───────── SUMMARY / DASHBOARD ─────────
financesRouter.get("/summary", async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisIn, thisOut, prevIn, prevOut, byCategory, upcoming] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { type: "INCOME", date: { gte: prevMonthStart, lt: monthStart } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "EXPENSE", date: { gte: prevMonthStart, lt: monthStart } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId", "type"],
        where: { date: { gte: monthStart, lt: monthEnd } },
        _sum: { amountCents: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { nextDueDate: "asc" },
        take: 5,
      }),
    ]);

    // Resolver nombres de categorías
    const catIds = byCategory.map((b) => b.categoryId).filter(Boolean) as string[];
    const cats = await prisma.financeCategory.findMany({ where: { id: { in: catIds } } });
    const catMap = new Map(cats.map((c) => [c.id, c]));

    res.json({
      month: {
        income: thisIn._sum.amountCents ?? 0,
        expense: thisOut._sum.amountCents ?? 0,
        balance: (thisIn._sum.amountCents ?? 0) - (thisOut._sum.amountCents ?? 0),
        incomeCount: thisIn._count,
        expenseCount: thisOut._count,
      },
      prevMonth: {
        income: prevIn._sum.amountCents ?? 0,
        expense: prevOut._sum.amountCents ?? 0,
        balance: (prevIn._sum.amountCents ?? 0) - (prevOut._sum.amountCents ?? 0),
      },
      byCategory: byCategory.map((b) => ({
        category: b.categoryId ? catMap.get(b.categoryId) ?? null : null,
        type: b.type,
        total: b._sum.amountCents ?? 0,
      })),
      upcomingRecurring: upcoming,
    });
  } catch (e) {
    next(e);
  }
});

// Serie mensual para gráfica (últimos N meses)
financesRouter.get("/series", async (req, res, next) => {
  try {
    const months = Math.min(24, Number(req.query.months) || 6);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const txs = await prisma.transaction.findMany({
      where: { date: { gte: start } },
      select: { type: true, amountCents: true, date: true },
    });

    const buckets = new Map<string, { income: number; expense: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, { income: 0, expense: 0 });
    }
    for (const t of txs) {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key);
      if (b) {
        if (t.type === "INCOME") b.income += t.amountCents;
        else b.expense += t.amountCents;
      }
    }
    const series = Array.from(buckets.entries()).map(([month, v]) => ({
      month,
      income: v.income,
      expense: v.expense,
      balance: v.income - v.expense,
    }));
    res.json({ series });
  } catch (e) {
    next(e);
  }
});

// Export CSV
financesRouter.get("/export.csv", async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 365 * 86400_000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();

    const txs = await prisma.transaction.findMany({
      where: { date: { gte: from, lte: to } },
      include: { category: true },
      orderBy: { date: "asc" },
      take: 10000,
    });

    function csv(v: unknown): string {
      if (v === null || v === undefined) return "";
      let s = String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
      return s;
    }
    const headers = ["fecha", "tipo", "origen", "categoria", "monto_usd", "descripcion", "nota"];
    const rows = txs.map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        t.type,
        t.source,
        t.category?.name ?? "",
        (t.amountCents / 100).toFixed(2),
        t.description ?? "",
        t.note ?? "",
      ].map(csv).join(",")
    );
    const body = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="finanzas_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`
    );
    res.send("﻿" + body);
  } catch (e) {
    next(e);
  }
});
