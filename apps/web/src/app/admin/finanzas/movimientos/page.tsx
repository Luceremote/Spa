"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Transaction, FinanceCategory, TxType, TxSource } from "@/lib/types";

const SOURCE_LABELS: Record<TxSource, string> = {
  MANUAL: "Manual",
  BOOKING: "Reserva",
  GIFT_CARD: "Gift card",
  RECURRING: "Recurrente",
  REFUND: "Reembolso",
};

interface FormState {
  type: TxType;
  amount: string; // en USD para el input
  date: string;   // YYYY-MM-DD
  description: string;
  note: string;
  categoryId: string;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const EMPTY: FormState = {
  type: "EXPENSE",
  amount: "",
  date: todayISO(),
  description: "",
  note: "",
  categoryId: "",
};

export default function MovimientosPage() {
  const { toast } = useToast();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | TxType>("");
  const [catFilter, setCatFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Form
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (catFilter) params.set("categoryId", catFilter);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    if (q) params.set("q", q);

    const [t, c] = await Promise.all([
      api<{ transactions: Transaction[] }>(`/finances/transactions?${params}`, { token }),
      cats.length > 0
        ? Promise.resolve({ categories: cats })
        : api<{ categories: FinanceCategory[] }>("/finances/categories", { token }),
    ]);
    setTxs(t.transactions);
    if (cats.length === 0) setCats((c as any).categories);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, catFilter, from, to]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }
  function openEdit(tx: Transaction) {
    setForm({
      type: tx.type,
      amount: (tx.amountCents / 100).toFixed(2),
      date: tx.date.slice(0, 10),
      description: tx.description ?? "",
      note: tx.note ?? "",
      categoryId: tx.categoryId ?? "",
    });
    setEditing(tx);
    setCreating(false);
  }
  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    const amountCents = Math.round(Number(form.amount) * 100);
    if (!amountCents || amountCents <= 0) return toast("Monto inválido", "error");
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amountCents,
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        description: form.description || null,
        note: form.note || null,
        categoryId: form.categoryId || null,
      };
      if (editing) {
        await api(`/finances/transactions/${editing.id}`, {
          token,
          method: "PUT",
          json: payload,
        });
        toast("Movimiento actualizado", "success");
      } else {
        await api("/finances/transactions", { token, method: "POST", json: payload });
        toast("Movimiento creado", "success");
      }
      close();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function del(tx: Transaction) {
    if (!confirm("¿Eliminar movimiento? No se puede deshacer.")) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/finances/transactions/${tx.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const filteredCats = useMemo(() => cats.filter((c) => !form.type || c.type === form.type), [cats, form.type]);

  // Totales del listado actual
  const totalIn = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const totalOut = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);

  const showForm = creating || !!editing;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/finanzas" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Volver a Finanzas
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Movimientos</h1>
          <p className="text-sm text-muted-foreground">Ingresos y gastos individuales</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold">{editing ? "Editar movimiento" : "Nuevo movimiento"}</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, type: "INCOME", categoryId: "" }))}
                className={`flex-1 py-3 rounded-md border-2 font-medium ${
                  form.type === "INCOME"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-border hover:border-green-300"
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-2" /> Ingreso
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, type: "EXPENSE", categoryId: "" }))}
                className={`flex-1 py-3 rounded-md border-2 font-medium ${
                  form.type === "EXPENSE"
                    ? "border-destructive bg-destructive/5 text-destructive"
                    : "border-border hover:border-destructive/40"
                }`}
              >
                <TrendingDown className="h-4 w-4 inline mr-2" /> Gasto
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto USD</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
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
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="ej. Compra de aceites para masajes"
              />
            </div>

            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.amount}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear movimiento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar descripción..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="INCOME">Solo ingresos</option>
                  <option value="EXPENSE">Solo gastos</option>
                </select>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                >
                  <option value="">Todas categorías</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="text-green-600 font-medium">
                  Ingresos: {formatMoney(totalIn)}
                </span>
                <span className="text-destructive font-medium">
                  Gastos: {formatMoney(totalOut)}
                </span>
                <span className="font-semibold ml-auto">
                  Balance:{" "}
                  <span className={totalIn - totalOut >= 0 ? "text-green-600" : "text-destructive"}>
                    {formatMoney(totalIn - totalOut)}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : txs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Sin movimientos en este filtro.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {txs.map((t) => (
                  <div key={t.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.type === "INCOME" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {t.type === "INCOME" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {t.description ?? <span className="text-muted-foreground italic">Sin descripción</span>}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{formatDate(t.date)}</span>
                        {t.category && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: t.category.color ?? "#9ca3af" }}
                            />
                            {t.category.name}
                          </span>
                        )}
                        {t.source !== "MANUAL" && (
                          <span className="px-2 py-0.5 bg-muted rounded text-[10px]">
                            {SOURCE_LABELS[t.source]}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        t.type === "INCOME" ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatMoney(t.amountCents)}
                    </span>
                    {t.source === "MANUAL" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => del(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
