"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, RotateCw, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatMoney, formatDate } from "@/lib/utils";
import type { RecurringTransaction, FinanceCategory, TxType, RecurFrequency } from "@/lib/types";

interface FormState {
  name: string;
  amount: string;
  type: TxType;
  categoryId: string;
  frequency: RecurFrequency;
  dayOfMonth: string;
  monthOfYear: string;
  weekday: string;
  nextDueDate: string;
  active: boolean;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const EMPTY: FormState = {
  name: "",
  amount: "",
  type: "EXPENSE",
  categoryId: "",
  frequency: "MONTHLY",
  dayOfMonth: "1",
  monthOfYear: "1",
  weekday: "1",
  nextDueDate: todayISO(),
  active: true,
};

const FREQ_LABELS: Record<RecurFrequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  YEARLY: "Anual",
};

export default function RecurrentesPage() {
  const { toast } = useToast();
  const [list, setList] = useState<RecurringTransaction[]>([]);
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const [r, c] = await Promise.all([
      api<{ recurring: RecurringTransaction[] }>("/finances/recurring", { token }),
      api<{ categories: FinanceCategory[] }>("/finances/categories", { token }),
    ]);
    setList(r.recurring);
    setCats(c.categories);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }
  function openEdit(r: RecurringTransaction) {
    setForm({
      name: r.name,
      amount: (r.amountCents / 100).toFixed(2),
      type: r.type,
      categoryId: r.categoryId ?? "",
      frequency: r.frequency,
      dayOfMonth: r.dayOfMonth?.toString() ?? "1",
      monthOfYear: r.monthOfYear?.toString() ?? "1",
      weekday: r.weekday?.toString() ?? "1",
      nextDueDate: r.nextDueDate.slice(0, 10),
      active: r.active,
    });
    setEditing(r);
    setCreating(false);
  }
  function close() { setEditing(null); setCreating(false); }

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    const amountCents = Math.round(Number(form.amount) * 100);
    if (!amountCents) return toast("Monto inválido", "error");
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        amountCents,
        type: form.type,
        categoryId: form.categoryId || null,
        frequency: form.frequency,
        nextDueDate: new Date(`${form.nextDueDate}T12:00:00`).toISOString(),
        active: form.active,
      };
      if (form.frequency === "WEEKLY") payload.weekday = Number(form.weekday);
      if (form.frequency === "MONTHLY") payload.dayOfMonth = Number(form.dayOfMonth);
      if (form.frequency === "YEARLY") {
        payload.dayOfMonth = Number(form.dayOfMonth);
        payload.monthOfYear = Number(form.monthOfYear);
      }
      if (editing) {
        await api(`/finances/recurring/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Recurrente actualizado", "success");
      } else {
        await api("/finances/recurring", { token, method: "POST", json: payload });
        toast("Recurrente creado", "success");
      }
      close(); load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function toggleActive(r: RecurringTransaction) {
    const token = getToken();
    if (!token) return;
    try {
      await api(`/finances/recurring/${r.id}`, {
        token, method: "PUT", json: { active: !r.active },
      });
      load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function del(r: RecurringTransaction) {
    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/finances/recurring/${r.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success");
      load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  const filteredCats = cats.filter((c) => c.type === form.type);
  const showForm = creating || !!editing;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/finanzas" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Volver a Finanzas
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Movimientos recurrentes</h1>
          <p className="text-sm text-muted-foreground">Gastos e ingresos automáticos (arriendo, suscripciones...)</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold">{editing ? "Editar recurrente" : "Nuevo recurrente"}</h2>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Arriendo local"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TxType, categoryId: "" }))}
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Monto USD</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">— Sin categoría —</option>
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <div className="flex gap-2">
                {(["WEEKLY", "MONTHLY", "YEARLY"] as RecurFrequency[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setForm((s) => ({ ...s, frequency: f }))}
                    className={`flex-1 py-2 rounded-md border-2 text-sm font-medium ${
                      form.frequency === f ? "border-primary bg-primary/5 text-primary" : "border-border"
                    }`}
                  >
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {form.frequency === "MONTHLY" && (
              <div className="space-y-2">
                <Label>Día del mes (1-31)</Label>
                <Input
                  type="number" min="1" max="31"
                  value={form.dayOfMonth}
                  onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                />
              </div>
            )}
            {form.frequency === "YEARLY" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Día</Label>
                  <Input type="number" min="1" max="31" value={form.dayOfMonth}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Mes (1-12)</Label>
                  <Input type="number" min="1" max="12" value={form.monthOfYear}
                    onChange={(e) => setForm((f) => ({ ...f, monthOfYear: e.target.value }))} />
                </div>
              </div>
            )}
            {form.frequency === "WEEKLY" && (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.weekday}
                  onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
                >
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                  <option value="0">Domingo</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Próxima ejecución</Label>
              <Input
                type="date"
                value={form.nextDueDate}
                onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
              />
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
              <Button onClick={handleSave} disabled={saving || !form.name || !form.amount}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <RotateCw className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sin movimientos recurrentes. Crea uno para automatizar gastos fijos como arriendo o suscripciones.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {list.map((r) => (
              <div key={r.id} className={`p-4 flex items-center gap-4 ${!r.active ? "opacity-50" : ""}`}>
                <RotateCw className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {FREQ_LABELS[r.frequency]} · Próximo: {formatDate(r.nextDueDate)}
                    {r.category && <span> · {r.category.name}</span>}
                  </p>
                </div>
                <span className={`font-semibold ${r.type === "INCOME" ? "text-green-600" : "text-destructive"}`}>
                  {r.type === "INCOME" ? "+" : "−"}{formatMoney(r.amountCents)}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r)} title={r.active ? "Pausar" : "Activar"}>
                    {r.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
