import { fetchReviews } from "@/lib/server-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Stars } from "@/components/stars";
import { ReviewForm } from "./review-form";
import { Quote } from "lucide-react";
import type { Review } from "@/lib/types";

export const metadata = { title: "Reseñas" };

export default async function ResenasPage() {
  const reviews: Review[] = await fetchReviews({ limit: 50 });

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="container py-8 sm:py-12 max-w-4xl">
      <header className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Reseñas</h1>
        {reviews.length > 0 && (
          <div className="inline-flex items-center gap-3 bg-primary/5 px-5 py-2 rounded-full">
            <Stars value={Math.round(avg)} size={20} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground text-sm">({reviews.length} reseñas)</span>
          </div>
        )}
      </header>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Quote className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aún no hay reseñas. ¡Sé el primero en compartir tu experiencia!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-12">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 sm:p-6">
                <Stars value={r.rating} />
                <p className="mt-3 text-sm sm:text-base text-foreground/90 leading-relaxed italic">
                  &ldquo;{r.comment}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="font-medium">{r.authorName}</span>
                  {r.serviceName && (
                    <span className="text-xs text-muted-foreground">{r.serviceName}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="border-t pt-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Deja tu reseña</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Tu opinión nos ayuda a mejorar y guía a otros clientes.
        </p>
        <ReviewForm />
      </div>
    </div>
  );
}
