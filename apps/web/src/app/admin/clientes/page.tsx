"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, User, Lock, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Customer, Booking } from "@/lib/types";

interface CustomerDetail extends Customer {
  bookings: Booking[];
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [privateNotes, setPrivateNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const t = setTimeout(() => {
      setLoading(true);
      api<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(q)}`, { token })
        .then((r) => setCustomers(r.customers))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function openDetail(c: Customer) {
    const token = getToken();
    if (!token) return;
    setLoadingDetail(true);
    setSelected({ ...c, bookings: [] });
    try {
      const r = await api<{ customer: CustomerDetail }>(`/customers/${c.id}`, { token });
      setSelected(r.customer);
      setPrivateNotes(r.customer.privateNotes ?? "");
    } catch (e: any) {
      toast(e.message, "error");
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/customers/${selected.id}`, {
        token,
        method: "PUT",
        json: { privateNotes: privateNotes || null },
      });
      toast("Notas guardadas", "success");
      setSelected({ ...selected, privateNotes });
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Base de datos y notas privadas</p>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay clientes aún.</p>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/40 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.phone} {c.email && `· ${c.email}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm flex-shrink-0 ml-2">
                    <p className="font-medium">{c._count?.bookings ?? 0} reservas</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(c.createdAt).toLocaleDateString("es")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <Card
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {selected.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold truncate">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {selected.phone} {selected.email && `· ${selected.email}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 hover:bg-muted rounded"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Notas que el cliente dejó al reservar */}
              {selected.notes && (
                <div className="bg-muted/40 p-3 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> Notas del cliente
                  </p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}

              {/* Notas privadas del admin */}
              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Lock className="h-3.5 w-3.5" /> Notas privadas
                </Label>
                <Textarea
                  rows={4}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Alergias, preferencias, observaciones (solo visible para el equipo)..."
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={saveNotes} disabled={saving || privateNotes === (selected.privateNotes ?? "")}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    Guardar notas
                  </Button>
                </div>
              </div>

              {/* Historial de reservas */}
              <div>
                <h3 className="font-semibold flex items-center gap-1 mb-3">
                  <Calendar className="h-4 w-4" /> Historial ({selected.bookings.length})
                </h3>
                {loadingDetail ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : selected.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Sin reservas</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selected.bookings.map((b) => (
                      <div key={b.id} className="p-3 rounded-md bg-muted/40 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{b.service?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(b.startAt)} ·{" "}
                            <span
                              className={
                                b.status === "COMPLETED"
                                  ? "text-green-600"
                                  : b.status === "CANCELLED" || b.status === "NO_SHOW"
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {b.status}
                            </span>
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary flex-shrink-0">
                          {formatMoney(b.priceCents)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
