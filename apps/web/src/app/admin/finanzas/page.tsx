"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  ListPlus,
  Tags,
  RotateCw,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, getToken, API_BASE } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import type { FinanceCategory, RecurringTransaction } from "@/lib/types";

interface Summary {
  month: { income: number; expense: number; balance: number; incomeCount: number; expenseCount: number };
  prevMonth: { income: number; expense: number; balance: number };
  byCategory: { category: FinanceCategory | null; type: "INCOME" | "EXPENSE"; total: number }[];
  upcomingRecurring: RecurringTransaction[];
}

export default function FinanzasDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<{ month: string; income: number; expense: number; balance: number }[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      api<{ summary?: any } & Summary>("/finances/summary", { token }),
      api<{ series: typeof series }>("/finances/series?months=6", { token }),
    ]).then(([s, r]) => {
      setSummary(s as Summary);
      setSeries(r.series);
    });
  }, []);

  const chartData = series.map((p) => ({
    month: p.month.slice(5),
    Ingresos: p.income / 100,
    Gastos: p.expense / 100,
  }));

  function downloadCsv() {
    const token = getToken();
    if (!token) return;
    fetch(`${API_BASE}/api/finances/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "finanzas.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  const balanceColor =
    summary && summary.month.balance >= 0 ? "text-green-600" : "text-destructive";
  const deltaIncome = summary
    ? summary.prevMonth.income > 0
      ? Math.round(((summary.month.income - summary.prevMonth.income) / summary.prevMonth.income) * 100)
      : null
    : null;
  const deltaExpense = summary
    ? summary.prevMonth.expense > 0
      ? Math.round(((summary.month.expense - summary.prevMonth.expense) / summary.prevMonth.expense) * 100)
      : null
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cartera & Finanzas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ingresos y gastos del negocio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/finanzas/movimientos">
              <Plus className="h-4 w-4" /> Nuevo movimiento
            </Link>
          </Button>
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Balance del mes</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className={`text-2xl font-bold ${balanceColor}`}>
              {summary ? formatMoney(summary.month.balance) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {summary ? formatMoney(summary.month.income) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.month.incomeCount ?? 0} movimientos
              {deltaIncome !== null && (
                <span className={`ml-2 ${deltaIncome >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {deltaIncome >= 0 ? "↑" : "↓"} {Math.abs(deltaIncome)}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Gastos</p>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive">
              {summary ? formatMoney(summary.month.expense) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.month.expenseCount ?? 0} movimientos
              {deltaExpense !== null && (
                <span className={`ml-2 ${deltaExpense > 0 ? "text-destructive" : "text-green-600"}`}>
                  {deltaExpense >= 0 ? "↑" : "↓"} {Math.abs(deltaExpense)}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Mes anterior</p>
              <RotateCw className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {summary ? formatMoney(summary.prevMonth.balance) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica 6 meses */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(v: number) => formatMoney(v * 100)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                />
                <Legend />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top categorías de gasto */}
        <Card>
          <CardHeader>
            <CardTitle>Top categorías de gasto</CardTitle>
            <CardDescription>Mes en curso</CardDescription>
          </CardHeader>
          <CardContent>
            {!summary || summary.byCategory.filter((c) => c.type === "EXPENSE").length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin gastos este mes.</p>
            ) : (
              <div className="space-y-3">
                {summary.byCategory
                  .filter((c) => c.type === "EXPENSE")
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 6)
                  .map((c, i) => {
                    const total = summary.month.expense || 1;
                    const pct = Math.round((c.total / total) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: c.category?.color ?? "#9ca3af" }}
                            />
                            {c.category?.name ?? "Sin categoría"}
                          </span>
                          <span className="font-medium">{formatMoney(c.total)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: c.category?.color ?? "#9ca3af" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos recurrentes */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Próximos recurrentes</CardTitle>
              <CardDescription>Gastos/ingresos automáticos</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/finanzas/recurrentes">Gestionar</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!summary || summary.upcomingRecurring.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin recurrentes configurados.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.upcomingRecurring.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-md bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.nextDueDate)}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        r.type === "INCOME" ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {r.type === "INCOME" ? "+" : "−"}
                      {formatMoney(r.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atajos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/admin/finanzas/movimientos", icon: ListPlus, title: "Movimientos", sub: "Listar y agregar" },
          { href: "/admin/finanzas/categorias", icon: Tags, title: "Categorías", sub: "Personalizar" },
          { href: "/admin/finanzas/recurrentes", icon: RotateCw, title: "Recurrentes", sub: "Gastos fijos" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/40 transition-colors"
          >
            <div className="p-5 flex items-center gap-3">
              <item.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
