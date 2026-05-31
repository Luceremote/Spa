"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { FinanceCategory, TxType } from "@/lib/types";

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#a855f7", "#f97316",
  "#0ea5e9", "#6b7280",
];

interface FormState { name: string; type: TxType; color: string; }
const EMPTY: FormState = { name: "", type: "EXPENSE", color: "#3b82f6" };

export default function CategoriasFinanzasPage() {
  const { toast } = useToast();
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const r = await api<{ categories: FinanceCategory[] }>("/finances/categories", { token });
    setCats(r.categories);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate(type: TxType) {
    setForm({ ...EMPTY, type });
    setCreating(true);
    setEditing(null);
  }
  function openEdit(c: FinanceCategory) {
    setForm({ name: c.name, type: c.type, color: c.color ?? "#3b82f6" });
    setEditing(c);
    setCreating(false);
  }
  function close() { setEditing(null); setCreating(false); }

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = { name: form.name, type: form.type, color: form.color };
      if (editing) {
        await api(`/finances/categories/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Categoría actualizada", "success");
      } else {
        await api("/finances/categories", { token, method: "POST", json: payload });
        toast("Categoría creada", "success");
      }
      close(); load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function del(c: FinanceCategory) {
    if (!confirm(`¿Eliminar "${c.name}"? Los movimientos asociados quedarán sin categoría.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/finances/categories/${c.id}`, { token, method: "DELETE" });
      toast("Eliminada", "success");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  const showForm = creating || !!editing;
  const income = cats.filter((c) => c.type === "INCOME");
  const expense = cats.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/finanzas" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-1">
          <ArrowLeft className="h-3 w-3" /> Volver a Finanzas
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">Categorías financieras</h1>
        <p className="text-sm text-muted-foreground">Organiza tus ingresos y gastos</p>
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4 max-w-xl">
            <h2 className="text-lg font-semibold">{editing ? "Editar categoría" : "Nueva categoría"}</h2>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType }))}
                disabled={!!editing}
              >
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Gasto</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(["INCOME", "EXPENSE"] as const).map((type) => {
            const list = type === "INCOME" ? income : expense;
            return (
              <Card key={type}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{type === "INCOME" ? "Ingresos" : "Gastos"}</h3>
                    <Button size="sm" variant="outline" onClick={() => openCreate(type)}>
                      <Plus className="h-3.5 w-3.5" /> Agregar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin categorías</p>
                    ) : (
                      list.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40">
                          <span className="w-3 h-3 rounded-full" style={{ background: c.color ?? "#9ca3af" }} />
                          <span className="flex-1 text-sm">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {c._count?.transactions ?? 0}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(c)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
