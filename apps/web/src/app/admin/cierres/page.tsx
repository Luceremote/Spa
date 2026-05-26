"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/utils";
import type { ClosedDate } from "@/lib/types";

export default function CierresPage() {
  const { toast } = useToast();
  const [closed, setClosed] = useState<ClosedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    const r = await api<{ closedDates: ClosedDate[] }>("/closed-dates");
    setClosed(r.closedDates);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const token = getToken();
    if (!token || !date) return;
    try {
      await api("/closed-dates", { token, method: "POST", json: { date, reason: reason || null } });
      toast(`Día ${date} marcado como cerrado`, "success");
      setDate("");
      setReason("");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleDel(c: ClosedDate) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`¿Reabrir ${c.date.slice(0, 10)}?`)) return;
    try {
      await api(`/closed-dates/${c.id}`, { token, method: "DELETE" });
      toast("Día reabierto", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Días cerrados</h1>
        <p className="text-muted-foreground">Bloquea fechas (vacaciones, festivos) para que no acepten reservas</p>
      </header>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-[1fr,2fr,auto] gap-3 items-end">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vacaciones, mantenimiento..."
              />
            </div>
            <Button onClick={handleAdd} disabled={!date}>
              <Plus className="h-4 w-4" /> Cerrar día
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : closed.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No tienes días cerrados programados.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {closed.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                <CalendarX className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium capitalize">{formatDate(c.date)}</p>
                  {c.reason && <p className="text-sm text-muted-foreground">{c.reason}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDel(c)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
