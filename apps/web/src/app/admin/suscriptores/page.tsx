"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";
import type { Subscriber } from "@/lib/types";

export default function SuscriptoresPage() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await api<{ subscribers: Subscriber[] }>("/subscribers", { token: getToken() });
    setSubs(r.subscribers);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function del(s: Subscriber) {
    if (!confirm(`¿Eliminar ${s.email}?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/subscribers/${s.id}`, { token, method: "DELETE" });
      toast("Suscriptor eliminado", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function exportCsv() {
    const csv = [
      "email,name,source,active,subscribedAt",
      ...subs.map((s) =>
        [s.email, s.name ?? "", s.source ?? "", s.active, s.createdAt].join(",")
      ),
    ].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const activeCount = subs.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Newsletter</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {activeCount} suscriptor{activeCount !== 1 ? "es" : ""} activo{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        {subs.length > 0 && (
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aún no tienes suscriptores. El formulario está activo en el footer del sitio público.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {subs.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${!s.active ? "line-through text-muted-foreground" : ""}`}>
                    {s.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.source ?? "manual"} · {formatDateTime(s.createdAt)}
                    {!s.active && " · dado de baja"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => del(s)}
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
