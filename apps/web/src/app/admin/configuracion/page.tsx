"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, uploadImage } from "@/lib/api";
import type { SiteConfig } from "@/lib/types";

function ImageUploader({
  value,
  onChange,
  size = "h-24 w-24",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  async function handle(file: File) {
    const token = getToken();
    if (!token) return;
    setErr("");
    setUploading(true);
    try {
      const { url } = await uploadImage(file, token);
      onChange(url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className={`${size} object-cover rounded-md border`} />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className={`${size} border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50`}>
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handle(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <div className="flex-1 space-y-1">
          <Input
            placeholder="O pegar URL https://..."
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP. Máx 3 MB.</p>
        </div>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    api<{ config: SiteConfig }>("/site-config").then((r) => setConfig(r.config));
  }, []);

  async function handleSave() {
    if (!config) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setSavedMsg("");
    try {
      const payload = {
        spaName: config.spaName,
        tagline: config.tagline,
        logoUrl: config.logoUrl,
        heroImageUrl: config.heroImageUrl,
        whatsappPhone: config.whatsappPhone,
        whatsappMsg: config.whatsappMsg,
        email: config.email,
        address: config.address,
        openingHours: config.openingHours,
      };
      await api("/site-config", { token, method: "PUT", json: payload });
      setSavedMsg("Guardado ✓");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const update = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) =>
    setConfig((c) => (c ? { ...c, [key]: value } : c));

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración del sitio</h1>
          <p className="text-muted-foreground">Datos públicos de tu spa</p>
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
          <CardTitle>Identidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del spa</Label>
            <Input value={config.spaName} onChange={(e) => update("spaName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tagline / lema</Label>
            <Input value={config.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo (opcional)</Label>
            <ImageUploader value={config.logoUrl} onChange={(v) => update("logoUrl", v)} />
          </div>
          <div className="space-y-2">
            <Label>Imagen hero / banner principal</Label>
            <ImageUploader
              value={config.heroImageUrl}
              onChange={(v) => update("heroImageUrl", v)}
              size="h-32 w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>WhatsApp (solo dígitos, formato internacional)</Label>
            <Input
              placeholder="15555551234"
              value={config.whatsappPhone}
              onChange={(e) => update("whatsappPhone", e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Sin el +. Ejemplo USA: 15555551234.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Mensaje pre-llenado de WhatsApp</Label>
            <Textarea
              value={config.whatsappMsg}
              onChange={(e) => update("whatsappMsg", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={config.email ?? ""}
              onChange={(e) => update("email", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Textarea
              value={config.address ?? ""}
              onChange={(e) => update("address", e.target.value || null)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Horario de atención</Label>
            <Input
              placeholder="Lun-Sáb 9:00-19:00"
              value={config.openingHours ?? ""}
              onChange={(e) => update("openingHours", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
