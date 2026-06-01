"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { ServicePackage, PackagePurchase, Service } from "@/lib/types";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";

interface FormState {
  id?: string;
  serviceId: string;
  name: string;
  sessions: number;
  priceCents: number;
  validityDays: number;
  active: boolean;
}

const EMPTY: FormState = {
  serviceId: "",
  name: "",
  sessions: 5,
  priceCents: 0,
  validityDays: 365,
  active: true,
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Pendiente", cls: "bg-muted text-muted-foreground" },
  ACTIVE: { label: "Activo", cls: "bg-primary text-primary-foreground" },
  EXPIRED: { label: "Expirado", cls: "bg-destructive text-white" },
  USED_UP: { label: "Agotado", cls: "border border-border" },
  CANCELLED: { label: "Cancelado", cls: "bg-destructive text-white" },
};

export default function PackagesAdminPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [purchases, setPurchases] = useState<PackagePurchase[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [pk, pu, sv] = await Promise.all([
        api<{ packages: ServicePackage[] }>("/packages/admin/list", {
          token: getToken() ?? undefined,
        }),
        api<{ purchases: PackagePurchase[] }>("/packages/purchases", {
          token: getToken() ?? undefined,
        }),
        api<{ services: Service[] }>("/services"),
      ]);
      setPackages(pk.packages);
      setPurchases(pu.purchases);
      setServices(sv.services);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm({ ...EMPTY, serviceId: services[0]?.id ?? "" });
  }
  function startEdit(p: ServicePackage) {
    setForm({
      id: p.id,
      serviceId: p.serviceId,
      name: p.name,
      sessions: p.sessions,
      priceCents: p.priceCents,
      validityDays: p.validityDays,
      active: p.active,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        serviceId: form.serviceId,
        name: form.name,
        sessions: form.sessions,
        priceCents: form.priceCents,
        validityDays: form.validityDays,
        active: form.active,
      };
      if (form.id) {
        await api(`/packages/${form.id}`, {
          method: "PUT",
          token: getToken() ?? undefined,
          json: body,
        });
      } else {
        await api("/packages", {
          method: "POST",
          token: getToken() ?? undefined,
          json: body,
        });
      }
      setForm(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este paquete? Las compras existentes no se afectan.")) return;
    await api(`/packages/${id}`, {
      method: "DELETE",
      token: getToken() ?? undefined,
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paquetes de servicios</h1>
          <p className="text-sm text-muted-foreground">
            Vende paquetes de N sesiones con descuento. El cliente reserva con su saldo.
          </p>
        </div>
        <Button onClick={startNew} disabled={services.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo paquete
        </Button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Editar paquete" : "Nuevo paquete"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Servicio</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Nombre del paquete</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Paquete Esencial — 5 sesiones"
                />
              </div>
              <div className="space-y-1">
                <Label>Sesiones incluidas</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.sessions}
                  onChange={(e) => setForm({ ...form, sessions: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Precio total (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(form.priceCents / 100).toFixed(2)}
                  onChange={(e) => setForm({ ...form, priceCents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Validez (días)</Label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={form.validityDays}
                  onChange={(e) => setForm({ ...form, validityDays: parseInt(e.target.value) || 365 })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium mt-7">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !form.name || !form.serviceId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paquetes ({packages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-primary" />
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay paquetes. Crea el primero para comenzar a venderlos.
            </p>
          ) : (
            <div className="divide-y">
              {packages.map((p) => (
                <div key={p.id} className="py-3 flex items-center gap-4">
                  <Tag className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.service?.name} · {p.sessions} sesiones · Validez {p.validityDays}d
                      {p._count && ` · ${p._count.purchases} vendidos`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${(p.priceCents / 100).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      ${(p.priceCents / p.sessions / 100).toFixed(2)}/sesión
                    </div>
                  </div>
                  {!p.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">Inactivo</span>
                  )}
                  <button onClick={() => startEdit(p)} className="p-2 hover:bg-muted rounded">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-2 hover:bg-muted rounded text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compras de clientes ({purchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay compras de paquetes.
            </p>
          ) : (
            <div className="divide-y">
              {purchases.map((pu) => {
                const st = STATUS_LABEL[pu.status];
                return (
                  <div key={pu.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pu.customer?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pu.package?.name} · {pu.customer?.phone} · expira{" "}
                        {new Date(pu.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {pu.sessionsRemaining}/{pu.sessionsTotal}
                      </div>
                      <div className="text-xs text-muted-foreground">restantes</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
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
