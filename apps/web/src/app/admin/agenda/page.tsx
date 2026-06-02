"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import type { Booking, BookingStatus, Staff } from "@/lib/types";

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-300 line-through",
  NO_SHOW: "bg-red-100 text-red-800 border-red-300",
};

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Lunes de la semana que contiene d
function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0=Lunes
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();
    const q = staffId ? `&staffId=${staffId}` : "";
    api<{ bookings: Booking[] }>(`/bookings?from=${from}&to=${to}${q}`, { token })
      .then((r) => setBookings(r.bookings))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api<{ staff: Staff[] }>("/staff", { token: getToken() ?? undefined })
      .then((r) => setStaffList(r.staff))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, staffId]);

  // Arrastrar una cita a otro día: conserva la hora, cambia la fecha.
  async function onDropDay(targetDay: Date) {
    const id = draggingId;
    setDragOverKey(null);
    setDraggingId(null);
    if (!id) return;
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const orig = new Date(b.startAt);
    const sameDay =
      orig.getFullYear() === targetDay.getFullYear() &&
      orig.getMonth() === targetDay.getMonth() &&
      orig.getDate() === targetDay.getDate();
    if (sameDay) return;
    const newStart = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      orig.getHours(),
      orig.getMinutes(),
      0,
      0
    );
    setMoving(true);
    try {
      await api(`/bookings/${id}`, {
        method: "PUT",
        token: getToken() ?? undefined,
        json: { startAt: newStart.toISOString() },
      });
      load();
    } catch (e: any) {
      alert(e.message ?? "No se pudo mover la cita");
      load();
    } finally {
      setMoving(false);
    }
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const d = new Date(b.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    for (const arr of map.values())
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return map;
  }, [bookings]);

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })();

  const rangeLabel = `${days[0].toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  })} – ${days[6].toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Agenda semanal
          </h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel}
            {moving ? (
              <span className="text-primary"> · moviendo…</span>
            ) : (
              <span className="hidden sm:inline"> · arrastra una cita a otro día para reagendar</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
          >
            <option value="">Todos los profesionales</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {days.map((d, i) => {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const list = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const canDrop = draggingId !== null;
            return (
              <div
                key={key}
                onDragOver={(e) => {
                  if (canDrop) {
                    e.preventDefault();
                    setDragOverKey(key);
                  }
                }}
                onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                onDrop={() => onDropDay(d)}
                className={`rounded-lg border min-h-[120px] transition-colors ${
                  dragOverKey === key
                    ? "border-primary border-dashed bg-primary/5"
                    : isToday
                    ? "border-primary ring-1 ring-primary/30"
                    : ""
                }`}
              >
                <div
                  className={`px-2 py-1.5 text-xs font-semibold border-b flex items-center justify-between ${
                    isToday ? "bg-primary/10 text-primary" : "bg-muted/40"
                  }`}
                >
                  <span>
                    {DAY_NAMES[i]} {d.getDate()}
                  </span>
                  {list.length > 0 && <span className="text-muted-foreground">{list.length}</span>}
                </div>
                <div className="p-1.5 space-y-1">
                  {list.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 text-center py-2">—</p>
                  ) : (
                    list.map((b) => {
                      const movable = ["PENDING", "CONFIRMED"].includes(b.status);
                      return (
                        <div
                          key={b.id}
                          draggable={movable && !moving}
                          onDragStart={() => movable && setDraggingId(b.id)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverKey(null);
                          }}
                          className={`text-[11px] leading-tight rounded border px-1.5 py-1 ${
                            STATUS_COLORS[b.status]
                          } ${movable ? "cursor-grab active:cursor-grabbing" : ""} ${
                            draggingId === b.id ? "opacity-40" : ""
                          }`}
                          title={`${b.customer?.name} · ${b.service?.name}${
                            b.staff ? ` · ${b.staff.name}` : ""
                          }${movable ? " · arrastra para mover de día" : ""}`}
                        >
                          <div className="font-semibold">{formatTime(b.startAt)}</div>
                          <div className="truncate">{b.service?.name}</div>
                          <div className="truncate opacity-80">{b.customer?.name}</div>
                          {!staffId && b.staff && (
                            <div className="truncate opacity-70">{b.staff.name}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
