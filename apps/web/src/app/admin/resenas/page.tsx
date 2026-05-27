"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, Star, Trash2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stars } from "@/components/stars";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";
import type { Review } from "@/lib/types";

export default function ResenasAdminPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "published" | "featured">("all");

  async function load() {
    setLoading(true);
    const r = await api<{ reviews: Review[] }>("/reviews/admin", { token: getToken() });
    setReviews(r.reviews);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function update(r: Review, patch: Partial<Review>) {
    const token = getToken();
    if (!token) return;
    try {
      await api(`/reviews/${r.id}`, { token, method: "PUT", json: patch });
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function del(r: Review) {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/reviews/${r.id}`, { token, method: "DELETE" });
      toast("Reseña eliminada", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.published;
    if (filter === "published") return r.published;
    if (filter === "featured") return r.featured;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.published).length;
  const avg =
    reviews.filter((r) => r.published).reduce((s, r, _, arr) => s + r.rating / arr.length, 0) || 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reseñas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Modera lo que dicen tus clientes
          </p>
        </div>
        {avg > 0 && (
          <div className="inline-flex items-center gap-2 bg-card border rounded-lg px-4 py-2">
            <Stars value={Math.round(avg)} size={18} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
          </div>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "published", "featured"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {f === "all"
              ? `Todas (${reviews.length})`
              : f === "pending"
              ? `Pendientes (${pendingCount})`
              : f === "published"
              ? `Publicadas`
              : `Destacadas`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Quote className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sin reseñas en este filtro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className={!r.published ? "border-yellow-300" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Stars value={r.rating} />
                    <span className="font-semibold">{r.authorName}</span>
                    {!r.published && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Pendiente
                      </span>
                    )}
                    {r.featured && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded">
                        Destacada
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="text-sm sm:text-base italic text-foreground/90 mb-2">
                  &ldquo;{r.comment}&rdquo;
                </p>
                {r.serviceName && (
                  <p className="text-xs text-muted-foreground mb-3">Sobre: {r.serviceName}</p>
                )}
                {r.authorEmail && (
                  <p className="text-xs text-muted-foreground mb-3">Email: {r.authorEmail}</p>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  {r.published ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update(r, { published: false })}
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Despublicar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => update(r, { published: true })}>
                      <Eye className="h-3.5 w-3.5" /> Publicar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(r, { featured: !r.featured })}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${r.featured ? "fill-yellow-400 text-yellow-400" : ""}`}
                    />
                    {r.featured ? "Quitar destacada" : "Destacar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    onClick={() => del(r)}
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
