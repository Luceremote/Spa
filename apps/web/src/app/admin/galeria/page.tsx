"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, GripVertical, Eye, EyeOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken, uploadImage } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { Photo } from "@/lib/types";

export default function GaleriaAdminPage() {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api<{ photos: Photo[] }>("/photos?all=true", { token: getToken() });
    setPhotos(r.photos);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleFiles(files: FileList) {
    const token = getToken();
    if (!token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadImage(file, token);
        await api("/photos", {
          token,
          method: "POST",
          json: { url, order: photos.length },
        });
      }
      toast(`${files.length} foto(s) subida(s)`, "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function updatePhoto(id: string, data: Partial<Photo>) {
    const token = getToken();
    if (!token) return;
    try {
      await api(`/photos/${id}`, { token, method: "PUT", json: data });
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function deletePhoto(p: Photo) {
    if (!confirm("¿Eliminar esta foto?")) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/photos/${p.id}`, { token, method: "DELETE" });
      toast("Foto eliminada", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Galería</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Fotos públicas que se muestran en el sitio
        </p>
      </header>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition-colors">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="font-medium">
                {uploading ? "Subiendo..." : "Haz clic o arrastra fotos aquí"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Puedes seleccionar múltiples. JPG, PNG, WebP. Máx 3 MB cada una.
              </p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </label>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Aún no tienes fotos. Sube algunas para llenar tu galería.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? ""}
                  className={`absolute inset-0 w-full h-full object-cover ${
                    !p.active ? "opacity-40" : ""
                  }`}
                />
                {!p.active && (
                  <span className="absolute top-2 left-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded">
                    Oculta
                  </span>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <Input
                  placeholder="Descripción (opcional)"
                  value={p.caption ?? ""}
                  onChange={(e) => setPhotos((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x))
                  )}
                  onBlur={(e) => updatePhoto(p.id, { caption: e.target.value || null })}
                  className="text-xs"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => updatePhoto(p.id, { active: !p.active })}
                    title={p.active ? "Ocultar" : "Mostrar"}
                  >
                    {p.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deletePhoto(p)}
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
