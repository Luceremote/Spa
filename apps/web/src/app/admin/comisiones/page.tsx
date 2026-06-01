"use client";

import { useEffect, useState } from "react";
import { Loader2, Percent, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import type { CommissionSummary } from "@/lib/types";

function thisMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function thisMonthEnd() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function ComisionesPage() {
  const [summary, setSummary] = useState<CommissionSummary[]>([]);
  const [from, setFrom] = useState(thisMonthStart());
  const [to, setTo] = useState(thisMonthEnd());
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getToken(); if (!token) return;
    setLoading(true);
    const fromISO = new Date(`${from}T00:00:00`).toISOString();
    const toISO = new Date(`${to}T23:59:59`).toISOString();
    const r = await api<{ summary: CommissionSummary[] }>(
      `/commissions?from=${fromISO}&to=${toISO}`,
      { token }
    );
    setSummary(r.summary);
    setLoading(false);
  }
  useEffect(() => { load(); }, [from, to]);

  const totalCommission = summary.reduce((s, x) => s + x.commissionCents, 0);
  const totalRevenue = summary.reduce((s, x) => s + x.totalRevenue, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Comisiones de staff</h1>
        <p className="text-sm text-muted-foreground">
          % de cada profesional sobre reservas completadas y pagadas
        </p>
      </header>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" /> Desde</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" /> Hasta</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total comisiones</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(totalCommission)}</p>
              <p className="text-xs text-muted-foreground">de {formatMoney(totalRevenue)} en ventas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : summary.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Percent className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sin datos. Asegúrate de que tus profesionales tengan un % asignado y haya reservas COMPLETADAS y PAGADAS en el periodo.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {summary.map((s) => (
              <div key={s.staff.id} className="p-4 flex items-center gap-4">
                {s.staff.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.staff.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {s.staff.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{s.staff.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.staff.commissionPercent}% · {s.count} reservas · {formatMoney(s.totalRevenue)} facturado
                  </p>
                </div>
                <p className="font-bold text-primary text-lg">{formatMoney(s.commissionCents)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Para asignar el % a cada profesional, ve a{" "}
        <a href="/admin/staff" className="text-primary hover:underline">Profesionales</a>.
        Solo se cuentan reservas con estado <code>COMPLETED</code> y pago confirmado.
      </p>
    </div>
  );
}
