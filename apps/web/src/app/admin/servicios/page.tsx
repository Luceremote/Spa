"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, uploadImage } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import type { Service, Category } from "@/lib/types";

function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    const token = getToken();
    if (!token) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await uploadImage(file, token);
      onChange(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Previa"
            className="h-32 w-32 object-cover rounded-md border"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-90"
            aria-label="Quitar imagen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 h-32 w-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className="text-center">
              <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Subir</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máx 3 MB.</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer">O pegar URL externa</summary>
        <Input
          className="mt-2"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </details>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  imageUrl: string;
  categoryId: string;
  active: boolean;
  featured: boolean;
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  priceCents: 0,
  durationMinutes: 60,
  imageUrl: "",
  categoryId: "",
  active: true,
  featured: false,
};

export default function ServiciosAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const [s, c] = await Promise.all([
      api<{ services: Service[] }>("/services?all=true"),
      api<{ categories: Category[] }>("/categories"),
    ]);
    setServices(s.services);
    setCategories(c.categories);
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

  function openEdit(s: Service) {
    setForm({
      name: s.name,
      slug: s.slug,
      description: s.description,
      priceCents: s.priceCents,
      durationMinutes: s.durationMinutes,
      imageUrl: s.imageUrl ?? "",
      categoryId: s.categoryId ?? "",
      active: s.active,
      featured: s.featured,
    });
    setEditing(s);
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
      const payload = {
        ...form,
        imageUrl: form.imageUrl || null,
        categoryId: form.categoryId || null,
      };
      if (editing) {
        await api(`/services/${editing.id}`, { token, method: "PUT", json: payload });
      } else {
        await api("/services", { token, method: "POST", json: payload });
      }
      close();
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Service) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/services/${s.id}`, { token, method: "DELETE" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Servicios</h1>
          <p className="text-muted-foreground">Administra el menú de tu spa</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo servicio
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Editar servicio" : "Nuevo servicio"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceCents / 100}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priceCents: Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagen del servicio (opcional)</Label>
              <ImageField
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Activo (visible al público)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                Destacado en home
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear servicio"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.category && (
                      <p className="text-xs text-muted-foreground">{s.category.name}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {s.featured && (
                      <span className="text-[10px] px-2 py-0.5 bg-accent/40 rounded">★</span>
                    )}
                    {!s.active && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted rounded">Oculto</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {s.description}
                </p>
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-muted-foreground">{s.durationMinutes} min</span>
                  <span className="font-bold text-primary">{formatMoney(s.priceCents)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(s)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
