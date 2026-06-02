"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { WaitlistEntry } from "@/lib/types";
import { Loader2, BellRing, Check, Trash2, Clock, Phone } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  WAITING: { label: "Esperando", cls: "bg-yellow-100 text-yellow-800" },
  NOTIFIED: { label: "Avisado", cls: "bg-blue-100 text-blue-800" },
  CONVERTED: { label: "Reservó", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", cls: "bg-gray-100 text-gray-600" },
};

export default function WaitlistAdminPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ entries: WaitlistEntry[] }>("/waitlist", { token: getToken() ?? undefined });
      setEntries(r.entries);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function notify(e: WaitlistEntry) {
    setBusyId(e.id);
    try {
      const r = await api<{ hadEmail: boolean }>(`/waitlist/${e.id}/notify`, {
        method: "POST",
        token: getToken() ?? undefined,
      });
      toast(r.hadEmail ? "Aviso enviado por email" : "Marcado como avisado (sin email)", "success");
      load();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(e: WaitlistEntry, status: string) {
    setBusyId(e.id);
    try {
      await api(`/waitlist/${e.id}`, {
        method: "PUT",
        token: getToken() ?? undefined,
        json: { status },
      });
      load();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(e: WaitlistEntry) {
    if (!confirm("¿Quitar de la lista de espera?")) return;
    setBusyId(e.id);
    try {
      await api(`/waitlist/${e.id}`, { method: "DELETE", token: getToken() ?? undefined });
      load();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lista de espera</h1>
        <p className="text-sm text-muted-foreground">
          Clientes esperando cupo. Se avisa automáticamente al cancelarse una reserva del mismo
          servicio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En espera ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-primary" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nadie en lista de espera ahora mismo. ✨
            </p>
          ) : (
            <div className="divide-y">
              {entries.map((e) => {
                const st = STATUS_LABEL[e.status];
                return (
                  <div key={e.id} className="py-3 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {e.customer?.name}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {e.service?.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {e.customer?.phone}
                        </span>
                        {e.customer?.email && <span>{e.customer.email}</span>}
                        {e.preferredDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            quería {new Date(e.preferredDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>· en lista desde {new Date(e.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                    {e.status !== "CONVERTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => notify(e)}
                        disabled={busyId === e.id}
                      >
                        {busyId === e.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BellRing className="h-4 w-4 mr-1" />
                        )}
                        Avisar
                      </Button>
                    )}
                    {e.status !== "CONVERTED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(e, "CONVERTED")}
                        disabled={busyId === e.id}
                        title="Marcar como que ya reservó"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <button
                      onClick={() => remove(e)}
                      className="p-2 hover:bg-muted rounded text-destructive"
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
