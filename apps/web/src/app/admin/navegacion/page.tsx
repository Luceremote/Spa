"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";
import type { SiteConfig } from "@/lib/types";
import { DEFAULT_NAV_LINKS } from "@/components/navbar";
import {
  Loader2,
  Save,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  visible: boolean;
}

export default function NavegacionPage() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ config: SiteConfig }>("/site-config");
      const fromCfg = r.config.navLinks;
      setLinks(
        fromCfg && fromCfg.length > 0
          ? fromCfg.map((l) => ({ ...l }))
          : DEFAULT_NAV_LINKS.map((l) => ({ ...l }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(i: number, patch: Partial<NavLink>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function remove(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setLinks((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function addNew() {
    setLinks((prev) => [...prev, { href: "/", label: "Nueva sección", visible: true }]);
  }

  function resetToDefault() {
    if (!confirm("¿Restaurar la navegación al estado por defecto? Perderás los cambios.")) return;
    setLinks(DEFAULT_NAV_LINKS.map((l) => ({ ...l })));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/site-config", {
        method: "PUT",
        token: getToken() ?? undefined,
        json: { navLinks: links },
      });
      setMsg("Guardado ✓ — refresca la página pública para ver los cambios");
    } catch (e: any) {
      setMsg(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Navegación pública</h1>
          <p className="text-sm text-muted-foreground">
            Edita, oculta o reordena los enlaces que aparecen en el header del sitio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar default
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enlaces ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {links.map((l, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-3 rounded-md border ${
                l.visible ? "bg-card" : "bg-muted/40 opacity-60"
              }`}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === links.length - 1}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  aria-label="Bajar"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={l.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Etiqueta"
                maxLength={40}
                className="flex-1 max-w-[180px]"
              />
              <Input
                value={l.href}
                onChange={(e) => update(i, { href: e.target.value })}
                placeholder="/ruta o https://..."
                maxLength={200}
                className="flex-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => update(i, { visible: !l.visible })}
                className="p-2 hover:bg-muted rounded"
                aria-label={l.visible ? "Ocultar" : "Mostrar"}
                title={l.visible ? "Visible — clic para ocultar" : "Oculto — clic para mostrar"}
              >
                {l.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-2 hover:bg-muted rounded text-destructive"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addNew} className="w-full mt-3">
            <Plus className="h-4 w-4 mr-2" />
            Añadir enlace
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-4 bg-card border rounded-lg p-3 shadow-md">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
