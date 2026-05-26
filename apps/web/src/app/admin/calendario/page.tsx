"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { formatMoney, formatTime } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/lib/types";

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
  NO_SHOW: "bg-red-100 text-red-800 border-red-300",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default function CalendarioPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const from = startOfMonth(cursor).toISOString();
    const to = endOfMonth(cursor).toISOString();
    api<{ bookings: Booking[] }>(`/bookings?from=${from}&to=${to}`, { token })
      .then((r) => setBookings(r.bookings))
      .finally(() => setLoading(false));
  }, [cursor]);

  const daysMatrix = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay(); // 0=Dom
    const daysInMonth = endOfMonth(cursor).getDate();
    const matrix: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) matrix.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      matrix.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (matrix.length % 7 !== 0) matrix.push(null);
    return matrix;
  }, [cursor]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const d = new Date(b.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings]);

  async function changeStatus(b: Booking, status: BookingStatus) {
    const token = getToken();
    if (!token) return;
    try {
      const { booking } = await api<{ booking: Booking }>(`/bookings/${b.id}`, {
        token,
        method: "PUT",
        json: { status },
      });
      setBookings((prev) => prev.map((x) => (x.id === booking.id ? booking : x)));
      setSelected(booking);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">Citas agendadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold w-40 text-center capitalize">
            {cursor.toLocaleDateString("es", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>
            Hoy
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center text-muted-foreground mb-2">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysMatrix.map((d, i) => {
              if (!d) return <div key={i} className="min-h-24 bg-muted/20 rounded-md" />;
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              const day = bookingsByDay.get(key) ?? [];
              const isToday =
                d.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={`min-h-24 border rounded-md p-1.5 flex flex-col gap-1 ${
                    isToday ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {d.getDate()}
                  </div>
                  {day.slice(0, 3).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className={`text-[10px] text-left px-1.5 py-1 rounded border truncate ${STATUS_COLORS[b.status]}`}
                      title={`${formatTime(b.startAt)} ${b.service?.name}`}
                    >
                      {formatTime(b.startAt)} {b.service?.name}
                    </button>
                  ))}
                  {day.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{day.length - 3} más
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{selected.service?.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[selected.status]}`}
                >
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <strong>{selected.customer?.name}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Tel:</span>{" "}
                  {selected.customer?.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Cuándo:</span>{" "}
                  {new Date(selected.startAt).toLocaleString("es")}
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <strong>{formatMoney(selected.priceCents)}</strong>
                </p>
                {selected.payment && (
                  <p>
                    <span className="text-muted-foreground">Pago:</span>{" "}
                    <strong>{selected.payment.status}</strong>
                  </p>
                )}
                {selected.notes && (
                  <p>
                    <span className="text-muted-foreground">Notas:</span> {selected.notes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(selected, "CONFIRMED")}
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(selected, "COMPLETED")}
                >
                  Completar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(selected, "NO_SHOW")}
                >
                  No asistió
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => changeStatus(selected, "CANCELLED")}
                >
                  Cancelar
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
