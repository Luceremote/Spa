"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { Loader2, Printer, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlyReport {
  period: { year: number; month: number; start: string; end: string };
  kpis: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    bookingsTotal: number;
    prevIncomeCents: number;
    incomeTxCount: number;
    expenseTxCount: number;
  };
  byStatus: { status: string; _count: number }[];
  topServices: {
    service: { id: string; name: string };
    count: number;
    revenueCents: number;
  }[];
  topStaff: {
    staff: { id: string; name: string; commissionPercent: number };
    count: number;
    revenueCents: number;
    commissionCents: number;
  }[];
}

function money(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`, {
        token: getToken() ?? undefined,
      });
      setReport(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const growth = report && report.kpis.prevIncomeCents > 0
    ? ((report.kpis.incomeCents - report.kpis.prevIncomeCents) / report.kpis.prevIncomeCents) * 100
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Reporte mensual</h1>
          <p className="text-sm text-muted-foreground">
            Resumen ejecutivo. Usa "Imprimir" para guardarlo como PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium w-40 text-center">
            {MONTHS[month - 1]} {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Encabezado para impresión */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold">Reporte mensual</h1>
        <p className="text-lg">{MONTHS[month - 1]} {year}</p>
      </div>

      {loading || !report ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {money(report.kpis.incomeCents)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.kpis.incomeTxCount} transacciones
                </div>
                {growth !== null && (
                  <div className={`text-xs font-medium mt-1 ${growth >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {growth >= 0 ? "▲" : "▼"} {Math.abs(growth).toFixed(1)}% vs mes anterior
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {money(report.kpis.expenseCents)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.kpis.expenseTxCount} transacciones
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.kpis.balanceCents >= 0 ? "text-primary" : "text-destructive"}`}>
                  {money(report.kpis.balanceCents)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reservas totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.kpis.bookingsTotal}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reservas por estado</CardTitle>
            </CardHeader>
            <CardContent>
              {report.byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin reservas en este mes.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {report.byStatus.map((s) => (
                    <div key={s.status} className="rounded border p-3 text-center">
                      <div className="text-xs text-muted-foreground">{STATUS_LABEL[s.status] ?? s.status}</div>
                      <div className="text-xl font-bold">{s._count}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 servicios</CardTitle>
            </CardHeader>
            <CardContent>
              {report.topServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">Servicio</th>
                      <th className="py-2 text-right">Reservas</th>
                      <th className="py-2 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topServices.map((s) => (
                      <tr key={s.service.id} className="border-b">
                        <td className="py-2">{s.service.name}</td>
                        <td className="py-2 text-right">{s.count}</td>
                        <td className="py-2 text-right font-medium">{money(s.revenueCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top staff (completadas)</CardTitle>
            </CardHeader>
            <CardContent>
              {report.topStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">Profesional</th>
                      <th className="py-2 text-right">Citas</th>
                      <th className="py-2 text-right">Ingresos</th>
                      <th className="py-2 text-right">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topStaff.map((s) => (
                      <tr key={s.staff.id} className="border-b">
                        <td className="py-2">{s.staff.name}</td>
                        <td className="py-2 text-right">{s.count}</td>
                        <td className="py-2 text-right">{money(s.revenueCents)}</td>
                        <td className="py-2 text-right font-medium text-primary">
                          {money(s.commissionCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
