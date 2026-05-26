"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import type { Service, Booking, Staff } from "@/lib/types";

interface Props {
  services: Service[];
  preselectedServiceId?: string;
}

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface GiftCardInfo {
  code: string;
  balanceCents: number;
  initialCents: number;
  applied: number; // cuánto se descontará en ESTA reserva
}

export function BookingForm({ services, preselectedServiceId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceId, setServiceId] = useState(preselectedServiceId ?? "");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [dayClosed, setDayClosed] = useState<{ closed: boolean; reason?: string | null }>({ closed: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Gift Card
  const [gcCode, setGcCode] = useState("");
  const [giftCard, setGiftCard] = useState<GiftCardInfo | null>(null);
  const [gcError, setGcError] = useState("");
  const [validatingGc, setValidatingGc] = useState(false);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  // Staff disponible para el servicio seleccionado
  useEffect(() => {
    if (!serviceId) return;
    api<{ staff: Staff[] }>(`/staff?serviceId=${serviceId}`)
      .then((r) => setStaffList(r.staff))
      .catch(() => setStaffList([]));
  }, [serviceId]);

  // Disponibilidad del día
  useEffect(() => {
    if (!date) return;
    const q = staffId ? `?date=${date}&staffId=${staffId}` : `?date=${date}`;
    api<{ bookings: { startAt: string }[]; closed: boolean; closedReason: string | null }>(
      `/bookings/availability${q}`
    )
      .then((r) => {
        setBusy(
          r.bookings.map((b) => {
            const d = new Date(b.startAt);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          })
        );
        setDayClosed({ closed: r.closed, reason: r.closedReason });
        if (r.closed) setTime("");
      })
      .catch(() => setBusy([]));
  }, [date, staffId]);

  async function validateGiftCard() {
    if (!gcCode || !service) return;
    setGcError("");
    setValidatingGc(true);
    try {
      const r = await api<{ giftCard: { code: string; balanceCents: number; initialCents: number } }>(
        `/gift-cards/balance/${encodeURIComponent(gcCode.trim())}`
      );
      const applied = Math.min(r.giftCard.balanceCents, service.priceCents);
      setGiftCard({ ...r.giftCard, applied });
    } catch (e: any) {
      setGcError(e.message);
      setGiftCard(null);
    } finally {
      setValidatingGc(false);
    }
  }

  function removeGiftCard() {
    setGcCode("");
    setGiftCard(null);
    setGcError("");
  }

  async function handleSubmit() {
    if (!service || !time) return;
    setError("");
    setSubmitting(true);
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
      const result = await api<{ booking: Booking }>("/bookings", {
        method: "POST",
        json: {
          customer: { name, phone, email: email || null, notes: null },
          serviceId: service.id,
          staffId: staffId || null,
          startAt,
          notes: notes || null,
          giftCardCode: giftCard?.code ?? null,
        },
      });
      setCreatedBooking(result.booking);
      setStep(3);
    } catch (e: any) {
      setError(e.message ?? "Error al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  }

  async function payNow() {
    if (!createdBooking) return;
    setSubmitting(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>("/payments/checkout", {
        method: "POST",
        json: { bookingId: createdBooking.id },
      });
      window.location.href = url;
    } catch (e: any) {
      setError(e.message ?? "Error iniciando el pago");
      setSubmitting(false);
    }
  }

  const finalPrice = service ? service.priceCents - (giftCard?.applied ?? 0) : 0;
  const isFreeAfterGc = createdBooking && createdBooking.priceCents === 0;

  // PASO 3 - Confirmación
  if (step === 3 && createdBooking) {
    return (
      <Card>
        <CardContent className="pt-6 sm:pt-8 px-4 sm:px-6 text-center">
          <CheckCircle2 className="h-14 sm:h-16 w-14 sm:w-16 mx-auto text-green-500 mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">¡Reserva creada!</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6">
            Tu cita para <strong>{service?.name}</strong> está agendada para el{" "}
            <strong>{date}</strong> a las <strong>{time}</strong>.
          </p>
          <div className="bg-muted/40 rounded-lg p-4 mb-5 sm:mb-6 max-w-sm mx-auto text-left text-sm space-y-2">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Servicio:</span>
              <span className="font-medium">{service?.name}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Duración:</span>
              <span className="font-medium">{service?.durationMinutes} min</span>
            </p>
            {createdBooking.discountCents > 0 && (
              <>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Precio:</span>
                  <span>{formatMoney(createdBooking.basePriceCents)}</span>
                </p>
                <p className="flex justify-between text-primary">
                  <span>Gift card:</span>
                  <span>− {formatMoney(createdBooking.discountCents)}</span>
                </p>
              </>
            )}
            <p className="flex justify-between text-base pt-2 border-t">
              <span className="font-semibold">Total a pagar:</span>
              <span className="font-bold text-primary">
                {formatMoney(createdBooking.priceCents)}
              </span>
            </p>
          </div>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isFreeAfterGc && (
              <Button size="lg" onClick={payNow} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Pagar ahora con tarjeta
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => router.push("/")}>
              {isFreeAfterGc ? "Listo, ir al inicio" : "Pagar en el spa"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {isFreeAfterGc
              ? "Tu reserva está cubierta por la gift card. Te esperamos."
              : "Tu reserva queda confirmada al recibir el pago."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">
          Paso {step} de 2: {step === 1 ? "Servicio y horario" : "Tus datos"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6 px-4 sm:px-6">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Servicio</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setStaffId("");
                  setGiftCard(null);
                  setGcCode("");
                }}
              >
                <option value="">— Selecciona un servicio —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatMoney(s.priceCents)} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>

            {staffList.length > 0 && (
              <div className="space-y-2">
                <Label>Profesional (opcional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value);
                    setTime("");
                  }}
                >
                  <option value="">— Cualquiera disponible —</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
              />
              {dayClosed.closed && (
                <p className="text-sm text-destructive">
                  Cerrado este día{dayClosed.reason ? `: ${dayClosed.reason}` : ""}
                </p>
              )}
            </div>

            {date && !dayClosed.closed && (
              <div className="space-y-2">
                <Label>Hora disponible</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SLOTS.map((slot) => {
                    const occupied = busy.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={occupied}
                        onClick={() => setTime(slot)}
                        className={`px-2 py-2.5 text-sm rounded-md border transition-colors ${
                          time === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : occupied
                            ? "bg-muted text-muted-foreground/50 line-through cursor-not-allowed"
                            : "bg-background hover:bg-accent"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!serviceId || !time || dayClosed.closed}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono / WhatsApp *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alergias, preferencias..."
              />
            </div>

            {/* Gift Card */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" /> Gift Card (opcional)
              </Label>
              {giftCard ? (
                <div className="p-3 bg-primary/5 border border-primary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-semibold text-sm">{giftCard.code}</span>
                    <button
                      onClick={removeGiftCard}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      type="button"
                      aria-label="Quitar gift card"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Saldo disponible: {formatMoney(giftCard.balanceCents)}</p>
                    <p className="text-primary font-medium">
                      Se aplicará: {formatMoney(giftCard.applied)}
                      {giftCard.applied < giftCard.balanceCents &&
                        ` (quedará ${formatMoney(giftCard.balanceCents - giftCard.applied)} para próxima)`}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="XXXX-XXXX-XXXX"
                      value={gcCode}
                      onChange={(e) => setGcCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateGiftCard}
                      disabled={!gcCode || validatingGc}
                    >
                      {validatingGc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ¿Aún no tienes una?{" "}
                    <a href="/gift-cards" className="text-primary hover:underline">
                      Compra una aquí
                    </a>
                  </p>
                </>
              )}
              {gcError && <p className="text-xs text-destructive">{gcError}</p>}
            </div>

            {service && (
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
                <p className="flex justify-between">
                  <span>{service.name}</span>
                  <span>{formatMoney(service.priceCents)}</span>
                </p>
                {giftCard && (
                  <p className="flex justify-between text-primary">
                    <span>Gift card ({giftCard.code}):</span>
                    <span>− {formatMoney(giftCard.applied)}</span>
                  </p>
                )}
                <p className="flex justify-between pt-1 border-t font-semibold">
                  <span>Total a pagar:</span>
                  <span className="text-primary">{formatMoney(finalPrice)}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {date} a las {time}
                </p>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !name || !phone}
                className="flex-1"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar reserva
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
