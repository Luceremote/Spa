"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  ArrowDown,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, uploadImage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatMoney } from "@/lib/utils";
import type { Product, ProductMovementType } from "@/lib/types";

interface FormState {
  name: string; sku: string; description: string;
  stock: number; unit: string;
  costCents: number | ""; priceCents: number | "";
  lowStockAlert: number; imageUrl: string; active: boolean;
}
const EMPTY: FormState = {
  name: "", sku: "", description: "", stock: 0, unit: "",
  costCents: "", priceCents: "", lowStockAlert: 5, imageUrl: "", active: true,
};

interface Summary { total: number; lowStock: number; outOfStock: number; inventoryValueCents: number; }

export default function InventarioPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [movementFor, setMovementFor] = useState<Product | null>(null);

  async function load() {
    const token = getToken(); if (!token) return;
    setLoading(true);
    const [p, s] = await Promise.all([
      api<{ products: Product[] }>("/products?all=true", { token }),
      api<Summary>("/products/dashboard/summary", { token }),
    ]);
    setProducts(p.products); setSummary(s); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setCreating(true); setEditing(null); }
  function openEdit(p: Product) {
    setForm({
      name: p.name, sku: p.sku ?? "", description: p.description ?? "",
      stock: p.stock, unit: p.unit ?? "",
      costCents: p.costCents ?? "", priceCents: p.priceCents ?? "",
      lowStockAlert: p.lowStockAlert, imageUrl: p.imageUrl ?? "", active: p.active,
    });
    setEditing(p); setCreating(false);
  }
  function close() { setEditing(null); setCreating(false); }

  async function handleSave() {
    const token = getToken(); if (!token) return;
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        sku: form.sku || null,
        description: form.description || null,
        stock: form.stock,
        unit: form.unit || null,
        costCents: form.costCents === "" ? null : Number(form.costCents),
        priceCents: form.priceCents === "" ? null : Number(form.priceCents),
        lowStockAlert: form.lowStockAlert,
        imageUrl: form.imageUrl || null,
        active: form.active,
      };
      if (editing) {
        await api(`/products/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Producto actualizado", "success");
      } else {
        await api("/products", { token, method: "POST", json: payload });
        toast("Producto creado", "success");
      }
      close(); load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function del(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    const token = getToken(); if (!token) return;
    try {
      await api(`/products/${p.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success"); load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function handleUpload(file: File) {
    const token = getToken(); if (!token) return;
    try {
      const { url } = await uploadImage(file, token);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e: any) { toast(e.message, "error"); }
  }

  const showForm = creating || !!editing;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">Productos del spa con control de stock</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        )}
      </header>

      {/* KPIs */}
      {summary && !showForm && (
        <div className="grid sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total activos</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-600">{summary.lowStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sin stock</p>
              <p className="text-2xl font-bold text-destructive">{summary.outOfStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Valor inventario</p>
              <p className="text-xl font-bold text-primary">{formatMoney(summary.inventoryValueCents)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm ? (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold">{editing ? "Editar producto" : "Nuevo producto"}</h2>
            <div className="grid sm:grid-cols-[1fr,160px] gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>SKU (opcional)</Label>
                    <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Input
                      placeholder="ml, kg, unidad..."
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagen</Label>
                {form.imageUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="" className="w-full h-32 object-cover rounded-md border" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="h-32 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50">
                    <Package className="h-6 w-6 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Stock actual</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Alerta stock bajo</Label>
                <Input type="number" min="0" value={form.lowStockAlert} onChange={(e) => setForm((f) => ({ ...f, lowStockAlert: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo (USD)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.costCents === "" ? "" : Number(form.costCents) / 100}
                  onChange={(e) => setForm((f) => ({ ...f, costCents: e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio venta (USD)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.priceCents === "" ? "" : Number(form.priceCents) / 100}
                  onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100) }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Activo
            </label>
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
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sin productos. Crea el primero para empezar tu inventario.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {products.map((p) => {
              const isLow = p.stock <= p.lowStockAlert && p.stock > 0;
              const isOut = p.stock <= 0;
              return (
                <div key={p.id} className={`p-4 flex items-center gap-3 ${!p.active ? "opacity-50" : ""}`}>
                  <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku && `${p.sku} · `}
                      {p.priceCents != null && `${formatMoney(p.priceCents)} · `}
                      Costo: {p.costCents != null ? formatMoney(p.costCents) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isOut ? "text-destructive" : isLow ? "text-amber-600" : ""}`}>
                      {p.stock} {p.unit ?? ""}
                    </p>
                    {(isLow || isOut) && (
                      <p className="text-[10px] flex items-center gap-1 justify-end text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> {isOut ? "Sin stock" : "Bajo"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setMovementFor(p)}>
                      Movimiento
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {movementFor && (
        <MovementModal
          product={movementFor}
          onClose={() => setMovementFor(null)}
          onDone={() => { setMovementFor(null); load(); }}
        />
      )}
    </div>
  );
}

function MovementModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [type, setType] = useState<ProductMovementType>("IN");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const token = getToken(); if (!token) return;
    setSaving(true);
    try {
      await api(`/products/${product.id}/movements`, {
        token, method: "POST",
        json: { type, quantity, note: note || null },
      });
      toast("Movimiento registrado", "success");
      onDone();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-sm text-muted-foreground">Stock actual: {product.stock}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["IN", "OUT", "ADJUSTMENT"] as ProductMovementType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-2 rounded-md border-2 text-sm ${type === t ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
              >
                {t === "IN" ? <><ArrowDown className="h-3 w-3 inline" /> Entrada</> : t === "OUT" ? <><ArrowUp className="h-3 w-3 inline" /> Salida</> : <><RotateCcw className="h-3 w-3 inline" /> Ajuste</>}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>{type === "ADJUSTMENT" ? "Nuevo stock total" : "Cantidad"}</Label>
            <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={submit} disabled={saving || quantity <= 0} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
