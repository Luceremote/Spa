"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { PromoBanner } from "@/lib/types";
import { Loader2, Save } from "lucide-react";

export default function BannerAdminPage() {
  const [banner, setBanner] = useState<PromoBanner | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ banner: PromoBanner }>("/marketing/banner").then((r) => setBanner(r.banner));
  }, []);

  async function save() {
    if (!banner) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ banner: PromoBanner }>("/marketing/banner", {
        method: "PUT",
        token: getToken() ?? undefined,
        json: banner,
      });
      setBanner(r.banner);
      setMsg("Guardado ✓");
    } catch (e: any) {
      setMsg(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!banner) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Banner promocional</h1>
        <p className="text-sm text-muted-foreground">
          Barra superior con anuncios o promos. Visible en todo el sitio público.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="w-full text-center text-sm py-2 px-4 rounded"
            style={{
              background: `hsl(${banner.bgColor})`,
              color: `hsl(${banner.textColor})`,
            }}
          >
            <span className="font-medium">{banner.text || "(sin texto)"}</span>
            {banner.ctaLabel && (
              <span className="ml-3 underline font-semibold">{banner.ctaLabel}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={banner.active}
              onChange={(e) => setBanner({ ...banner, active: e.target.checked })}
            />
            Banner activo
          </label>

          <div className="space-y-1">
            <Label>Texto principal</Label>
            <Input
              value={banner.text}
              onChange={(e) => setBanner({ ...banner, text: e.target.value })}
              maxLength={280}
              placeholder="🎁 20% de descuento esta semana"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>CTA texto (opcional)</Label>
              <Input
                value={banner.ctaLabel ?? ""}
                onChange={(e) => setBanner({ ...banner, ctaLabel: e.target.value })}
                maxLength={40}
                placeholder="Reservar"
              />
            </div>
            <div className="space-y-1">
              <Label>CTA URL (opcional)</Label>
              <Input
                value={banner.ctaUrl ?? ""}
                onChange={(e) => setBanner({ ...banner, ctaUrl: e.target.value })}
                maxLength={500}
                placeholder="/reservar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Color de fondo (HSL)</Label>
              <Input
                value={banner.bgColor}
                onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
                placeholder="160 60% 35%"
              />
            </div>
            <div className="space-y-1">
              <Label>Color de texto (HSL)</Label>
              <Input
                value={banner.textColor}
                onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
                placeholder="0 0% 100%"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={banner.dismissible}
              onChange={(e) => setBanner({ ...banner, dismissible: e.target.checked })}
            />
            Permitir que el visitante lo cierre
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
