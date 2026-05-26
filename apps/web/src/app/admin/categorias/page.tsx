"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { Category } from "@/lib/types";

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
  order: number;
}
const EMPTY: FormState = { name: "", slug: "", description: "", order: 0 };

export default function CategoriasPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api<{ categories: Category[] }>("/categories");
    setCategories(r.categories);
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
  function openEdit(c: Category) {
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      order: c.order,
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
      const payload = {
        ...form,
        description: form.description || null,
      };
      if (editing) {
        await api(`/categories/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Categoría actualizada", "success");
      } else {
        await api("/categories", { token, method: "POST", json: payload });
        toast("Categoría creada", "success");
      }
      close();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDel(c: Category) {
    if (!confirm(`¿Eliminar "${c.name}"? Los servicios quedarán sin categoría.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/categories/${c.id}`, { token, method: "DELETE" });
      toast("Eliminada", "success");
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
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">Agrupa tus servicios</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4 max-w-xl">
            <h2 className="text-lg font-semibold">{editing ? "Editar" : "Nueva categoría"}</h2>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: editing ? f.slug : slugify(name) }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
              />
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
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
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {categories.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                <FolderTree className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    /{c.slug} · {c._count?.services ?? 0} servicios
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDel(c)}>
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
