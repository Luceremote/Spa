"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken, uploadImage, API_BASE } from "@/lib/api";
import type { PromoPopup } from "@/lib/types";
import { Loader2, Save, Upload, Trash2 } from "lucide-react";

function absUrl(u: string | null): string | null {
  if (!u) return null;
  return u.startsWith("http") ? u : `${API_BASE}${u}`;
}

export default function PopupAdminPage() {
  const [popup, setPopup] = useState<PromoPopup | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ popup: PromoPopup }>("/marketing/popup").then((r) => setPopup(r.popup));
  }, []);

  async function save() {
    if (!popup) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ popup: PromoPopup }>("/marketing/popup", {
        method: "PUT",
        token: getToken() ?? undefined,
        json: popup,
      });
      setPopup(r.popup);
      setMsg("Guardado ✓");
    } catch (e: any) {
      setMsg(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onPickImage(file: File) {
    const t = getToken();
    if (!t || !popup) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, t);
      setPopup({ ...popup, imageUrl: url });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setUploading(false);
    }
  }

  if (!popup) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Pop-up promocional</h1>
        <p className="text-sm text-muted-foreground">
          Ventana emergente que aparece tras unos segundos. Se muestra una vez por dispositivo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={popup.active}
              onChange={(e) => setPopup({ ...popup, active: e.target.checked })}
            />
            Pop-up activo
          </label>

          <div className="space-y-1">
            <Label>Título</Label>
            <Input
              value={popup.title}
              onChange={(e) => setPopup({ ...popup, title: e.target.value })}
              maxLength={120}
            />
          </div>

          <div className="space-y-1">
            <Label>Cuerpo</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
              value={popup.body}
              onChange={(e) => setPopup({ ...popup, body: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>CTA texto</Label>
              <Input
                value={popup.ctaLabel}
                onChange={(e) => setPopup({ ...popup, ctaLabel: e.target.value })}
                maxLength={40}
              />
            </div>
            <div className="space-y-1">
              <Label>CTA URL</Label>
              <Input
                value={popup.ctaUrl}
                onChange={(e) => setPopup({ ...popup, ctaUrl: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagen (opcional)</Label>
            {popup.imageUrl && (
              <div className="relative inline-block">
                <img
                  src={absUrl(popup.imageUrl)!}
                  alt=""
                  className="h-32 rounded border object-cover"
                />
                <button
                  onClick={() => setPopup({ ...popup, imageUrl: null })}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                  aria-label="Quitar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {popup.imageUrl ? "Reemplazar imagen" : "Subir imagen"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Mostrar después de (segundos)</Label>
              <Input
                type="number"
                min={0}
                max={300}
                value={popup.showAfterSec}
                onChange={(e) =>
                  setPopup({ ...popup, showAfterSec: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Mostrar una vez cada (días)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={popup.showOncePerDays}
                onChange={(e) =>
                  setPopup({ ...popup, showOncePerDays: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

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
