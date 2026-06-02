"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { Loader2, Banknote, CreditCard, ArrowLeftRight, Wallet, Printer } from "lucide-react";

interface CashReport {
  date: string;
  collectedCents: number;
  methods: { method: string; totalCents: number; count: number }[];
  bookingsToday: number;
  completedToday: number;
  finance: { incomeCents: number; expenseCents: number; balanceCents: number };
}

const METHOD_META: Record<string, { label: string; icon: any }> = {
  STRIPE_CARD: { label: "Tarjeta (Stripe)", icon: CreditCard },
  CASH: { label: "Efectivo", icon: Banknote },
  TRANSFER: { label: "Transferencia", icon: ArrowLeftRight },
  OTHER: { label: "Otro", icon: Wallet },
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CajaPage() {
  const [date, setDate] = useState(todayISO());
  const [report, setReport] = useState<CashReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api<CashReport>(`/reports/cash?date=${date}`, {
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
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Caja del día</h1>
          <p className="text-sm text-muted-foreground">
            Dinero cobrado y desglose por método de pago.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      {loading || !report ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-muted-foreground uppercase tracking-wide">
                Total cobrado el {new Date(report.date + "T12:00:00").toLocaleDateString()}
              </div>
              <div className="text-4xl font-bold text-primary mt-2">
                {formatMoney(report.collectedCents)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {report.completedToday} de {report.bookingsToday} citas completadas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por método de pago</CardTitle>
            </CardHeader>
            <CardContent>
              {report.methods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No se registraron cobros este día.
                </p>
              ) : (
                <div className="space-y-3">
                  {report.methods.map((m) => {
                    const meta = METHOD_META[m.method] ?? { label: m.method, icon: Wallet };
                    const pct =
                      report.collectedCents > 0
                        ? Math.round((m.totalCents / report.collectedCents) * 100)
                        : 0;
                    return (
                      <div key={m.method} className="flex items-center gap-3">
                        <meta.icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{meta.label}</span>
                            <span className="font-semibold">{formatMoney(m.totalCents)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {m.count} cobro(s) · {pct}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground">Ingresos (contables)</div>
                <div className="text-lg font-bold text-emerald-600">
                  {formatMoney(report.finance.incomeCents)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground">Gastos</div>
                <div className="text-lg font-bold text-destructive">
                  {formatMoney(report.finance.expenseCents)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="text-lg font-bold text-primary">
                  {formatMoney(report.finance.balanceCents)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
