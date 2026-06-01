"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { MembershipTier, CustomerMembership, Customer } from "@/lib/types";
import { Loader2, Plus, Pencil, Trash2, Crown, UserPlus, X } from "lucide-react";

interface TierForm {
  id?: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  discountPercent: number;
  perks: string;
  color: string;
  active: boolean;
}

const EMPTY_TIER: TierForm = {
  name: "",
  description: "",
  monthlyPriceCents: 0,
  discountPercent: 10,
  perks: "",
  color: "#a855f7",
  active: true,
};

export default function MembershipsPage() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierForm, setTierForm] = useState<TierForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState<{ customerId: string; tierId: string; expiresAt: string; note: string }>({
    customerId: "",
    tierId: "",
    expiresAt: "",
    note: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [t, m, c] = await Promise.all([
        api<{ tiers: MembershipTier[] }>("/memberships/tiers/admin/list", {
          token: getToken() ?? undefined,
        }),
        api<{ memberships: CustomerMembership[] }>("/memberships/customers", {
          token: getToken() ?? undefined,
        }),
        api<{ customers: Customer[] }>("/customers", { token: getToken() ?? undefined }),
      ]);
      setTiers(t.tiers);
      setMemberships(m.memberships);
      setCustomers(c.customers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNewTier() {
    setTierForm(EMPTY_TIER);
  }
  function startEditTier(t: MembershipTier) {
    setTierForm({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      monthlyPriceCents: t.monthlyPriceCents,
      discountPercent: t.discountPercent,
      perks: t.perks ?? "",
      color: t.color ?? "#a855f7",
      active: t.active,
    });
  }

  async function saveTier() {
    if (!tierForm) return;
    setSaving(true);
    try {
      const body = {
        name: tierForm.name,
        description: tierForm.description || null,
        monthlyPriceCents: tierForm.monthlyPriceCents,
        discountPercent: tierForm.discountPercent,
        perks: tierForm.perks || null,
        color: tierForm.color || null,
        active: tierForm.active,
      };
      if (tierForm.id) {
        await api(`/memberships/tiers/${tierForm.id}`, {
          method: "PUT",
          token: getToken() ?? undefined,
          json: body,
        });
      } else {
        await api("/memberships/tiers", {
          method: "POST",
          token: getToken() ?? undefined,
          json: body,
        });
      }
      setTierForm(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeTier(id: string) {
    if (!confirm("¿Eliminar este tier? Falla si hay clientes asignados.")) return;
    try {
      await api(`/memberships/tiers/${id}`, {
        method: "DELETE",
        token: getToken() ?? undefined,
      });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function submitAssign() {
    try {
      const body = {
        customerId: assign.customerId,
        tierId: assign.tierId,
        expiresAt: assign.expiresAt ? new Date(assign.expiresAt).toISOString() : null,
        note: assign.note || null,
      };
      await api("/memberships/assign", {
        method: "POST",
        token: getToken() ?? undefined,
        json: body,
      });
      setAssignOpen(false);
      setAssign({ customerId: "", tierId: "", expiresAt: "", note: "" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function cancelMembership(customerId: string) {
    if (!confirm("¿Cancelar esta membresía?")) return;
    await api(`/memberships/customers/${customerId}`, {
      method: "DELETE",
      token: getToken() ?? undefined,
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membresías</h1>
          <p className="text-sm text-muted-foreground">
            Define tiers con descuento recurrente y asigna clientes manualmente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignOpen(true)} disabled={tiers.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" /> Asignar a cliente
          </Button>
          <Button onClick={startNewTier}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo tier
          </Button>
        </div>
      </div>

      {tierForm && (
        <Card>
          <CardHeader>
            <CardTitle>{tierForm.id ? "Editar tier" : "Nuevo tier"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="Bronce, Plata, Oro…"
                />
              </div>
              <div className="space-y-1">
                <Label>Precio mensual (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(tierForm.monthlyPriceCents / 100).toFixed(2)}
                  onChange={(e) =>
                    setTierForm({
                      ...tierForm,
                      monthlyPriceCents: Math.round((parseFloat(e.target.value) || 0) * 100),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>% de descuento por reserva</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={tierForm.discountPercent}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, discountPercent: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Color del badge</Label>
                <Input
                  type="color"
                  value={tierForm.color}
                  onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción (visible al cliente)</Label>
              <Input
                value={tierForm.description}
                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Beneficios (uno por línea)</Label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
                value={tierForm.perks}
                onChange={(e) => setTierForm({ ...tierForm, perks: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={tierForm.active}
                onChange={(e) => setTierForm({ ...tierForm, active: e.target.checked })}
              />
              Tier activo
            </label>
            <div className="flex gap-2">
              <Button onClick={saveTier} disabled={saving || !tierForm.name}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setTierForm(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tiers ({tiers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-primary" />
          ) : tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin tiers definidos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border bg-card p-4 space-y-2"
                  style={{ borderTop: `4px solid ${t.color ?? "#a855f7"}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold flex items-center gap-1.5">
                        <Crown className="h-4 w-4" style={{ color: t.color ?? "#a855f7" }} />
                        {t.name}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        ${(t.monthlyPriceCents / 100).toFixed(2)}/mes · {t.discountPercent}% descuento
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditTier(t)}
                        className="p-1.5 hover:bg-muted rounded"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeTier(t.id)}
                        className="p-1.5 hover:bg-muted rounded text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {t.description && <p className="text-sm">{t.description}</p>}
                  {t.perks && (
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {t.perks.split("\n").filter(Boolean).map((p, i) => (
                        <li key={i}>· {p}</li>
                      ))}
                    </ul>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {t._count?.memberships ?? 0} clientes · {t.active ? "Activo" : "Inactivo"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes con membresía ({memberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay clientes asignados a un tier.
            </p>
          ) : (
            <div className="divide-y">
              {memberships.map((m) => (
                <div key={m.id} className="py-3 flex items-center gap-4">
                  <Crown className="h-5 w-5" style={{ color: m.tier?.color ?? "#a855f7" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.customer?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.customer?.phone} · Desde {new Date(m.startedAt).toLocaleDateString()}
                      {m.expiresAt && ` · Expira ${new Date(m.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ background: m.tier?.color ?? "#a855f7" }}
                  >
                    {m.tier?.name} ({m.tier?.discountPercent}%)
                  </span>
                  <button
                    onClick={() => cancelMembership(m.customerId)}
                    className="p-2 hover:bg-muted rounded text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {assignOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAssignOpen(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Asignar membresía a cliente</h3>
            <div className="space-y-1">
              <Label>Cliente</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={assign.customerId}
                onChange={(e) => setAssign({ ...assign, customerId: e.target.value })}
              >
                <option value="">— Seleccionar —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tier</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={assign.tierId}
                onChange={(e) => setAssign({ ...assign, tierId: e.target.value })}
              >
                <option value="">— Seleccionar —</option>
                {tiers.filter((t) => t.active).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.discountPercent}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Expira el (opcional)</Label>
              <Input
                type="date"
                value={assign.expiresAt}
                onChange={(e) => setAssign({ ...assign, expiresAt: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Nota (opcional)</Label>
              <Input
                value={assign.note}
                onChange={(e) => setAssign({ ...assign, note: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submitAssign} disabled={!assign.customerId || !assign.tierId}>
                Asignar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
