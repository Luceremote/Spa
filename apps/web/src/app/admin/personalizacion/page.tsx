"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { Theme } from "@/lib/types";

// Presets de paleta (cada preset = 6 colores HSL)
const PALETTES: { name: string; theme: Partial<Theme> }[] = [
  {
    name: "Spa Rosa",
    theme: {
      colorPrimary: "340 75% 55%",
      colorSecondary: "160 40% 70%",
      colorAccent: "45 90% 70%",
      colorBackground: "30 40% 98%",
      colorForeground: "220 15% 20%",
      colorMuted: "30 20% 92%",
    },
  },
  {
    name: "Lujo Dorado",
    theme: {
      colorPrimary: "40 80% 50%",
      colorSecondary: "0 0% 15%",
      colorAccent: "40 60% 80%",
      colorBackground: "40 20% 97%",
      colorForeground: "0 0% 10%",
      colorMuted: "40 15% 90%",
    },
  },
  {
    name: "Verde Zen",
    theme: {
      colorPrimary: "150 50% 40%",
      colorSecondary: "100 30% 75%",
      colorAccent: "60 60% 70%",
      colorBackground: "120 20% 98%",
      colorForeground: "150 25% 15%",
      colorMuted: "120 15% 92%",
    },
  },
  {
    name: "Lavanda",
    theme: {
      colorPrimary: "270 50% 55%",
      colorSecondary: "290 30% 75%",
      colorAccent: "320 60% 80%",
      colorBackground: "270 30% 98%",
      colorForeground: "260 20% 20%",
      colorMuted: "270 15% 93%",
    },
  },
  {
    name: "Océano",
    theme: {
      colorPrimary: "200 75% 45%",
      colorSecondary: "180 40% 70%",
      colorAccent: "190 80% 75%",
      colorBackground: "200 30% 98%",
      colorForeground: "210 30% 15%",
      colorMuted: "200 15% 92%",
    },
  },
  {
    name: "Minimal Negro",
    theme: {
      colorPrimary: "0 0% 10%",
      colorSecondary: "0 0% 90%",
      colorAccent: "0 70% 50%",
      colorBackground: "0 0% 100%",
      colorForeground: "0 0% 5%",
      colorMuted: "0 0% 95%",
    },
  },
];

const FONTS = ["Inter", "Poppins", "Playfair Display", "Lora"];
const TEMPLATES = [
  { value: "elegant", label: "Elegante" },
  { value: "modern", label: "Moderno" },
  { value: "minimal", label: "Minimal" },
  { value: "luxury", label: "Lujo" },
];

function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(" ").map((v, i) => parseFloat(v.replace("%", "")));
  const sN = s / 100, lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function PersonalizacionPage() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    api<{ theme: Theme }>("/theme").then((r) => setTheme(r.theme));
  }, []);

  // Aplicar cambios en vivo
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--background", theme.colorBackground);
    root.style.setProperty("--foreground", theme.colorForeground);
    root.style.setProperty("--primary", theme.colorPrimary);
    root.style.setProperty("--secondary", theme.colorSecondary);
    root.style.setProperty("--accent", theme.colorAccent);
    root.style.setProperty("--muted", theme.colorMuted);
    root.style.setProperty("--header", (theme as any).colorHeader || theme.colorBackground);
    root.style.setProperty("--card", theme.colorBackground);
    root.style.setProperty("--border", theme.colorMuted);
    root.style.setProperty("--input", theme.colorMuted);
    root.style.setProperty("--ring", theme.colorPrimary);
    root.style.setProperty("--radius", theme.borderRadius);
    root.style.setProperty("--container-width", theme.containerWidth);
    root.style.setProperty("--card-padding", theme.cardPadding);
    root.style.setProperty("--font-sans", `"${theme.fontFamily}", system-ui, sans-serif`);
  }, [theme]);

  async function handleSave() {
    if (!theme) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setSavedMsg("");
    try {
      await api("/theme", { token, method: "PUT", json: theme });
      setSavedMsg("Guardado ✓ — aplicado al sitio público");
      setTimeout(() => setSavedMsg(""), 4000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  function applyPalette(p: Partial<Theme>) {
    // El header sigue al fondo de la paleta para mantener coherencia visual
    setTheme((t) => (t ? { ...t, ...p, colorHeader: p.colorBackground ?? (t as any).colorHeader } : t));
  }

  if (!theme) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const update = <K extends keyof Theme>(key: K, value: Theme[K]) =>
    setTheme((t) => (t ? { ...t, [key]: value } : t));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personalización</h1>
          <p className="text-muted-foreground">
            Los cambios se previsualizan en vivo. Guarda para aplicarlos al sitio público.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Paletas predefinidas</CardTitle>
          <CardDescription>Aplica un esquema completo de un clic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPalette(p.theme)}
                className="text-left p-4 border rounded-lg hover:border-primary transition-colors"
              >
                <p className="text-sm font-medium mb-2">{p.name}</p>
                <div className="flex gap-1">
                  {[
                    p.theme.colorPrimary,
                    p.theme.colorSecondary,
                    p.theme.colorAccent,
                    p.theme.colorBackground,
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded border"
                      style={{ background: `hsl(${c})` }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colores</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <ColorRow label="Primario" value={theme.colorPrimary} onChange={(v) => update("colorPrimary", v)} />
          <ColorRow label="Secundario" value={theme.colorSecondary} onChange={(v) => update("colorSecondary", v)} />
          <ColorRow label="Acento" value={theme.colorAccent} onChange={(v) => update("colorAccent", v)} />
          <ColorRow label="Fondo" value={theme.colorBackground} onChange={(v) => update("colorBackground", v)} />
          <ColorRow label="Barra superior (menú)" value={(theme as any).colorHeader ?? theme.colorBackground} onChange={(v) => update("colorHeader" as any, v)} />
          <ColorRow label="Texto" value={theme.colorForeground} onChange={(v) => update("colorForeground", v)} />
          <ColorRow label="Apagado" value={theme.colorMuted} onChange={(v) => update("colorMuted", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Radio de bordes</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.borderRadius}
              onChange={(e) => update("borderRadius", e.target.value)}
            >
              <option value="0">Cuadrado (0)</option>
              <option value="0.25rem">Suave (4px)</option>
              <option value="0.5rem">Medio (8px)</option>
              <option value="0.75rem">Redondeado (12px)</option>
              <option value="1rem">Muy redondeado (16px)</option>
              <option value="1.5rem">Pill (24px)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Padding de tarjetas</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.cardPadding}
              onChange={(e) => update("cardPadding", e.target.value)}
            >
              <option value="0.75rem">Compacto</option>
              <option value="1rem">Pequeño</option>
              <option value="1.5rem">Normal</option>
              <option value="2rem">Amplio</option>
              <option value="2.5rem">Muy amplio</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Ancho del contenedor</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.containerWidth}
              onChange={(e) => update("containerWidth", e.target.value)}
            >
              <option value="1024px">Estrecho (1024px)</option>
              <option value="1200px">Estándar (1200px)</option>
              <option value="1400px">Amplio (1400px)</option>
              <option value="100%">Completo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Plantilla</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.template}
              onChange={(e) => update("template", e.target.value as Theme["template"])}
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipografía</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Familia de fuente</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.fontFamily}
              onChange={(e) => update("fontFamily", e.target.value)}
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tamaño base</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={theme.fontSizeBase}
              onChange={(e) => update("fontSizeBase", e.target.value)}
            >
              <option value="14px">Pequeño (14px)</option>
              <option value="16px">Normal (16px)</option>
              <option value="18px">Grande (18px)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
          <CardDescription>Componentes con el tema actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button>Botón primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="spa-card">
            <h4 className="font-semibold mb-1">Ejemplo de tarjeta</h4>
            <p className="text-sm text-muted-foreground">
              Así se ve el contenido con el tema seleccionado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = (() => {
    try {
      return hslToHex(value);
    } catch {
      return "#000000";
    }
  })();
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="h-10 w-14 rounded-md border border-input cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );
}
