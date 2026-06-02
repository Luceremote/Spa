"use client";

import { useRef, useState } from "react";
import { Loader2, Star, CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, API_BASE } from "@/lib/api";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function absUrl(u: string): string {
  return u.startsWith("http") ? u : `${API_BASE}${u}`;
}

export function ReviewForm() {
  const [authorName, setName] = useState("");
  const [authorEmail, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      setError("La imagen supera 3 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${PUBLIC_API}/uploads/review-image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo subir la imagen");
      }
      const { url } = await res.json();
      setPhotoUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/reviews", {
        method: "POST",
        json: {
          authorName,
          authorEmail: authorEmail || null,
          rating,
          comment,
          serviceName: serviceName || null,
          photoUrl: photoUrl || null,
        },
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <h3 className="text-lg font-semibold mb-2">¡Gracias por tu reseña!</h3>
          <p className="text-sm text-muted-foreground">
            La revisaremos antes de publicarla. Apreciamos tu tiempo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <Label className="block mb-2">Tu calificación</Label>
            <div
              className="flex justify-center gap-1"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(i)}
                  onClick={() => setRating(i)}
                  aria-label={`${i} estrellas`}
                  className="p-1"
                >
                  <Star
                    className={`h-7 w-7 sm:h-8 sm:w-8 transition-colors ${
                      i <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rname">Tu nombre *</Label>
              <Input
                id="rname"
                value={authorName}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="remail">Email (opcional, no se publica)</Label>
              <Input
                id="remail"
                type="email"
                value={authorEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rservice">Servicio que recibiste (opcional)</Label>
            <Input
              id="rservice"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Facial Hidratante Premium"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="rcomment">Tu reseña *</Label>
            <Textarea
              id="rcomment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Cuéntanos cómo fue tu experiencia..."
            />
          </div>

          <div className="space-y-1">
            <Label>Foto (opcional)</Label>
            {photoUrl ? (
              <div className="relative inline-block">
                <img
                  src={absUrl(photoUrl)}
                  alt="Tu foto"
                  className="h-28 w-28 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                  aria-label="Quitar foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPhoto(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  Agregar foto
                </Button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting || uploading}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar reseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
