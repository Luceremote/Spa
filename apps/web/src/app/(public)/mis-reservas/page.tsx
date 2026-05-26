"use client";

import { useState } from "react";
import { Loader2, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-800",
};

export default function MisReservasPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api<{ bookings: Booking[] }>(
        `/bookings/lookup?phone=${encodeURIComponent(phone)}`
      );
      setBookings(r.bookings);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-8 sm:py-12 max-w-2xl">
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Mis reservas</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Consulta tu historial ingresando el teléfono con el que reservaste.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={search} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>
            <Button type="submit" disabled={loading || !phone}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      {bookings && (
        <div className="mt-6 space-y-3">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No encontramos reservas para ese teléfono.
              </CardContent>
            </Card>
          ) : (
            bookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold">{b.service?.name}</h3>
                      {b.staff && (
                        <p className="text-xs text-muted-foreground">con {b.staff.name}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[b.status] ?? ""}`}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {formatDateTime(b.startAt)}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-sm">
                      {b.payment?.status === "PAID" ? (
                        <span className="text-green-700 font-medium">Pagado</span>
                      ) : (
                        <span className="text-muted-foreground">Por pagar</span>
                      )}
                    </span>
                    <span className="font-bold text-primary">{formatMoney(b.priceCents)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
