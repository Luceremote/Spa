"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Booking } from "@/lib/types";

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface Props {
  booking: Booking;
  phone: string;
  onClose: () => void;
  onDone: () => void;
}

export function RescheduleModal({ booking, phone, onClose, onDone }: Props) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [closed, setClosed] = useState<{ closed: boolean; reason: string | null }>({
    closed: false,
    reason: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const staffId = booking.staff?.id ?? booking.staffId ?? null;

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
            return `${String(d.getHours()).padStart(2, "0")}:${String(
              d.getMinutes()
            ).padStart(2, "0")}`;
          })
        );
        setClosed({ closed: r.closed, reason: r.closedReason });
        if (r.closed) setTime("");
      })
      .catch(() => setBusy([]));
  }, [date, staffId]);

  async function submit() {
    if (!time) return;
    setSaving(true);
    setError("");
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
      await api(`/bookings/${booking.id}/reschedule-public`, {
        method: "POST",
        json: { phone, startAt },
      });
      onDone();
    } catch (e: any) {
      setError(e.message ?? "No se pudo reagendar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card">
          <h3 className="font-semibold">Reagendar — {booking.service?.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Nueva fecha</Label>
            <Input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
            />
            {closed.closed && (
              <p className="text-sm text-destructive">
                Cerrado este día{closed.reason ? `: ${closed.reason}` : ""}
              </p>
            )}
          </div>

          {date && !closed.closed && (
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving || !time || closed.closed} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar cambio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
