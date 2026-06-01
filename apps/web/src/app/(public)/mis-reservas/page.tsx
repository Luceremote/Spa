"use client";

import { useState } from "react";
import { Loader2, Search, Calendar, CalendarClock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import { RescheduleModal } from "./reschedule-modal";

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

// Horas de antelación para que el cliente pueda gestionar (debe coincidir con el backend)
const MIN_SELF_MANAGE_HOURS = 12;

export default function MisReservasPage() {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function runSearch(targetPhone: string) {
    setError("");
    setLoading(true);
    try {
      const r = await api<{ bookings: Booking[] }>(
        `/bookings/lookup?phone=${encodeURIComponent(targetPhone)}`
      );
      setBookings(r.bookings);
      setSearchedPhone(targetPhone);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    runSearch(phone);
  }

  function canManage(b: Booking): boolean {
    if (!["PENDING", "CONFIRMED"].includes(b.status)) return false;
    const hoursUntil = (new Date(b.startAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= MIN_SELF_MANAGE_HOURS;
  }

  async function cancel(b: Booking) {
    if (!confirm(`¿Cancelar tu reserva de "${b.service?.name}"? Esta acción no se puede deshacer.`))
      return;
    setActioningId(b.id);
    try {
      const r = await api<{ wasPaid: boolean }>(`/bookings/${b.id}/cancel-public`, {
        method: "POST",
        json: { phone: searchedPhone },
      });
      if (r.wasPaid) {
        alert("Reserva cancelada. Como ya estaba pagada, te contactaremos para el reembolso.");
      }
      await runSearch(searchedPhone);
    } catch (e: any) {
      alert(e.message ?? "No se pudo cancelar");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="container py-8 sm:py-12 max-w-2xl">
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Mis reservas</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Consulta, reagenda o cancela ingresando el teléfono con el que reservaste.
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
            bookings.map((b) => {
              const manageable = canManage(b);
              return (
                <Card key={b.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold">{b.service?.name}</h3>
                        {b.staff && (
                          <p className="text-xs text-muted-foreground">con {b.staff.name}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[b.status] ?? ""}`}>
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

                    {manageable && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setRescheduling(b)}
                          disabled={actioningId === b.id}
                        >
                          <CalendarClock className="h-4 w-4 mr-1.5" /> Reagendar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => cancel(b)}
                          disabled={actioningId === b.id}
                        >
                          {actioningId === b.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1.5" />
                          )}
                          Cancelar
                        </Button>
                      </div>
                    )}
                    {!manageable && ["PENDING", "CONFIRMED"].includes(b.status) && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Para cambios con menos de {MIN_SELF_MANAGE_HOURS}h de antelación, contáctanos
                        directamente.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {rescheduling && (
        <RescheduleModal
          booking={rescheduling}
          phone={searchedPhone}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            runSearch(searchedPhone);
          }}
        />
      )}
    </div>
  );
}
