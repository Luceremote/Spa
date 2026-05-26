"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api, getToken } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

interface Summary {
  revenueMonthCents: number;
  revenueTodayCents: number;
  paidPaymentsMonth: number;
  bookingsMonth: number;
  totalCustomers: number;
  upcoming: Booking[];
}

interface TopService {
  service: Service;
  bookings: number;
  revenueCents: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<{ month: string; revenueCents: number }[]>([]);
  const [top, setTop] = useState<TopService[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      api<{ summary: Summary }>("/dashboard/summary", { token }),
      api<{ series: typeof series }>("/dashboard/revenue?monthsBack=5", { token }),
      api<{ top: TopService[] }>("/dashboard/top-services", { token }),
    ]).then(([s, r, t]) => {
      setSummary(s.summary);
      setSeries(r.series);
      setTop(t.top);
    });
  }, []);

  const chartData = series.map((p) => ({
    month: p.month.slice(5),
    revenue: p.revenueCents / 100,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen del mes en curso</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            const token = getToken();
            if (!token) return;
            const url = `${API_BASE}/api/export/bookings.csv`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return alert("Error al exportar");
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "reservas.csv";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ganancias del mes"
          value={summary ? formatMoney(summary.revenueMonthCents) : "—"}
          icon={DollarSign}
          subtitle={`${summary?.paidPaymentsMonth ?? 0} pagos confirmados`}
        />
        <StatCard
          title="Ganancias de hoy"
          value={summary ? formatMoney(summary.revenueTodayCents) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          title="Reservas del mes"
          value={String(summary?.bookingsMonth ?? "—")}
          icon={CalendarCheck}
        />
        <StatCard
          title="Clientes totales"
          value={String(summary?.totalCustomers ?? "—")}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ganancias mensuales</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(v: number) => formatMoney(v * 100)}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay reservas próximas.</p>
            )}
            <div className="space-y-3">
              {summary?.upcoming.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                >
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.service?.name} — {b.customer?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(b.startAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatMoney(b.priceCents)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top servicios</CardTitle>
            <CardDescription>Más reservados (confirmados/completados)</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún sin datos.</p>
            )}
            <div className="space-y-3">
              {top.map((t) => (
                <div
                  key={t.service?.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-medium">{t.service?.name}</p>
                    <p className="text-xs text-muted-foreground">{t.bookings} reservas</p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatMoney(t.revenueCents)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: any;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
