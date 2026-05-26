"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Coupon } from "@/lib/types";

interface FormState {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  expiresAt: string;
  maxUses: number | "";
  minPriceCents: number | "";
}
const EMPTY: FormState = {
  code: "",
  type: "PERCENT",
  value: 10,
  active: true,
  expiresAt: "",
  maxUses: "",
  minPriceCents: "",
};

export default function CuponesPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const r = await api<{ coupons: Coupon[] }>("/coupons", { token });
    setCoupons(r.coupons);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }
  function openEdit(c: Coupon) {
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "",
      maxUses: c.maxUses ?? "",
      minPriceCents: c.minPriceCents ?? "",
    });
    setEditing(c);
    setCreating(false);
  }
  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: form.value,
        active: form.active,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        maxUses: form.maxUses === "" ? null : Number(form.maxUses),
        minPriceCents: form.minPriceCents === "" ? null : Number(form.minPriceCents),
      };
      if (editing) {
        await api(`/coupons/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Cupón actualizado", "success");
      } else {
        await api("/coupons", { token, method: "POST", json: payload });
        toast("Cupón creado", "success");
      }
      close();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Coupon) {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/coupons/${c.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cupones</h1>
          <p className="text-muted-foreground">Descuentos para tus clientes</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo cupón
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editing ? "Editar cupón" : "Nuevo cupón"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="WELCOME10"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                >
                  <option value="PERCENT">% Porcentaje</option>
                  <option value="FIXED">$ Monto fijo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  {form.type === "PERCENT" ? "Porcentaje (%)" : "Monto USD"}
                </Label>
                <Input
                  type="number"
                  min={form.type === "PERCENT" ? 1 : 0.01}
                  max={form.type === "PERCENT" ? 100 : undefined}
                  step={form.type === "PERCENT" ? 1 : 0.01}
                  value={form.type === "PERCENT" ? form.value : form.value / 100}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      value: form.type === "PERCENT"
                        ? Number(e.target.value)
                        : Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Expira (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. usos (vacío = sin límite)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Monto mínimo USD (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minPriceCents === "" ? "" : Number(form.minPriceCents) / 100}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minPriceCents:
                        e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Activo
            </label>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.code || !form.value}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Sin cupones aún.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {coupons.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const usedUp = c.maxUses && c.usedCount >= c.maxUses;
              const inactive = !c.active || expired || usedUp;
              return (
                <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      inactive ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold">{c.code}</code>
                      {inactive && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">
                          {expired ? "Expirado" : usedUp ? "Agotado" : "Inactivo"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value)} ·
                      {c._count?.bookings ?? c.usedCount} usos
                      {c.maxUses ? ` / ${c.maxUses}` : ""}
                      {c.expiresAt && ` · expira ${formatDate(c.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
