"use client";

import { useState } from "react";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

export function ReviewForm() {
  const [authorName, setName] = useState("");
  const [authorEmail, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar reseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
