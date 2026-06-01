"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { Loader2, Send, UserX } from "lucide-react";

interface InactiveCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  lastBookingAt: string | null;
  lastFollowupAt: string | null;
  daysSince: number | null;
}

export default function FollowupPage() {
  const [list, setList] = useState<InactiveCustomer[]>([]);
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ customers: InactiveCustomer[] }>(
        `/reports/inactive-customers?days=${days}`,
        { token: getToken() ?? undefined }
      );
      setList(r.customers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function sendBatch() {
    if (!confirm("Enviar lote de emails de seguimiento (respeta cooldown de 30 días)?")) return;
    setSending(true);
    setMsg(null);
    try {
      const r = await api<{ sent: number }>("/reports/followup/send", {
        method: "POST",
        token: getToken() ?? undefined,
      });
      setMsg(`Enviados ${r.sent} emails de seguimiento.`);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Seguimiento de clientes</h1>
          <p className="text-sm text-muted-foreground">
            Clientes que no han vuelto en mucho tiempo. Envía un recordatorio personalizado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
          >
            <option value={30}>+30 días sin volver</option>
            <option value={60}>+60 días sin volver</option>
            <option value={90}>+90 días sin volver</option>
            <option value={180}>+180 días sin volver</option>
          </select>
          <Button onClick={sendBatch} disabled={sending || list.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar lote
          </Button>
        </div>
      </div>

      {msg && <div className="text-sm bg-muted/40 border rounded px-3 py-2">{msg}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Inactivos ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-primary" />
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay clientes inactivos en este rango. ✨
            </p>
          ) : (
            <div className="divide-y">
              {list.map((c) => (
                <div key={c.id} className="py-3 flex items-center gap-4">
                  <UserX className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.email ?? "(sin email)"} · {c.phone}
                      {c.lastBookingAt && ` · Última: ${new Date(c.lastBookingAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-destructive">{c.daysSince ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">días</div>
                  </div>
                  {c.lastFollowupAt && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Ya contactado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
