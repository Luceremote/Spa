"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Upload, X, Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, uploadImage } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { SiteConfig, HoursByDay } from "@/lib/types";

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
          <label
            className={`${size} border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50`}
          >
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

const DAYS: { key: keyof HoursByDay; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ config: SiteConfig }>("/site-config").then((r) => setConfig(r.config));
  }, []);

  async function handleSave() {
    if (!config) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const { id, ...payload } = config;
      await api("/site-config", { token, method: "PUT", json: payload });
      toast("Configuración guardada ✓", "success");
    } catch (e: any) {
      toast(e.message, "error");
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

  const updateDay = (key: keyof HoursByDay, value: string) => {
    setConfig((c) => {
      if (!c) return c;
      const hoursByDay: HoursByDay = { ...(c.hoursByDay ?? {}) };
      if (value) hoursByDay[key] = value;
      else delete hoursByDay[key];
      return { ...c, hoursByDay };
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between flex-wrap gap-3 sticky top-14 md:top-0 z-10 bg-muted/30 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 py-3 -mt-4 sm:-mt-6 md:-mt-10 border-b backdrop-blur">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configuración del sitio</h1>
          <p className="text-sm text-muted-foreground">Datos públicos de tu spa</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </header>

      {/* IDENTIDAD */}
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

      {/* SOBRE NOSOTROS */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre nosotros</CardTitle>
          <CardDescription>Bio/historia mostrada en la página /sobre y como sección en la home</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder={`Conoce ${config.spaName}`}
              value={config.aboutTitle ?? ""}
              onChange={(e) => update("aboutTitle", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Bio / Historia</Label>
            <Textarea
              rows={6}
              placeholder="Cuéntanos sobre tu spa, tu trayectoria, lo que te apasiona..."
              value={config.aboutText ?? ""}
              onChange={(e) => update("aboutText", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              Soporta múltiples párrafos. Usa Enter para separar.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Foto destacada (opcional)</Label>
            <ImageUploader
              value={config.aboutImageUrl}
              onChange={(v) => update("aboutImageUrl", v)}
              size="h-32 w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* CONTACTO */}
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
            <p className="text-xs text-muted-foreground">Sin el +. Ejemplo USA: 15555551234.</p>
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
            <Label>Teléfono para llamar (opcional, distinto del WhatsApp)</Label>
            <Input
              placeholder="+1 555 555 1234"
              value={config.callPhone ?? ""}
              onChange={(e) => update("callPhone", e.target.value || null)}
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
            <Label>Google Maps embed URL (opcional)</Label>
            <Input
              placeholder="https://www.google.com/maps/embed?pb=..."
              value={config.googleMapsUrl ?? ""}
              onChange={(e) => update("googleMapsUrl", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              En Google Maps → busca tu negocio → Compartir → Insertar mapa → copia el src del iframe. Si lo dejas vacío,
              se generará uno automático a partir de la dirección.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* HORARIOS DESGLOSADOS */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios</CardTitle>
          <CardDescription>Si llenas los días, sobreescriben el "Horario de atención" resumido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Resumen rápido (opcional)</Label>
            <Input
              placeholder="Lun-Sáb 9:00-19:00"
              value={config.openingHours ?? ""}
              onChange={(e) => update("openingHours", e.target.value || null)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-24 flex-shrink-0">{label}</Label>
                <Input
                  placeholder="9:00-18:00 o Cerrado"
                  value={config.hoursByDay?.[key] ?? ""}
                  onChange={(e) => updateDay(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* REDES SOCIALES */}
      <Card>
        <CardHeader>
          <CardTitle>Redes sociales</CardTitle>
          <CardDescription>Aparecen como iconos en el footer y en la página de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Instagram className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="https://instagram.com/tu_usuario"
              value={config.instagramUrl ?? ""}
              onChange={(e) => update("instagramUrl", e.target.value || null)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Facebook className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="https://facebook.com/tu_pagina"
              value={config.facebookUrl ?? ""}
              onChange={(e) => update("facebookUrl", e.target.value || null)}
            />
          </div>
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
            </svg>
            <Input
              placeholder="https://tiktok.com/@tu_usuario"
              value={config.tiktokUrl ?? ""}
              onChange={(e) => update("tiktokUrl", e.target.value || null)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Twitter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="https://twitter.com/tu_usuario"
              value={config.twitterUrl ?? ""}
              onChange={(e) => update("twitterUrl", e.target.value || null)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Youtube className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="https://youtube.com/@tu_canal"
              value={config.youtubeUrl ?? ""}
              onChange={(e) => update("youtubeUrl", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* POLÍTICAS */}
      <Card>
        <CardHeader>
          <CardTitle>Políticas</CardTitle>
          <CardDescription>
            Visibles en el footer. Si dejas un campo vacío, se muestra un texto por defecto razonable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Política de cancelación</Label>
            <Textarea
              rows={4}
              placeholder="Para cancelar avísanos con 24h..."
              value={config.cancellationPolicy ?? ""}
              onChange={(e) => update("cancellationPolicy", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Política de privacidad</Label>
            <Textarea
              rows={6}
              placeholder="Respetamos tu privacidad..."
              value={config.privacyPolicy ?? ""}
              onChange={(e) => update("privacyPolicy", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Términos y condiciones</Label>
            <Textarea
              rows={6}
              placeholder="Al utilizar nuestros servicios..."
              value={config.termsOfService ?? ""}
              onChange={(e) => update("termsOfService", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
