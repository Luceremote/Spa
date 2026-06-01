import { Card, CardContent } from "@/components/ui/card";
import { ReviewForm } from "../review-form";

export const metadata = { title: "Deja tu reseña" };

export default function NuevaResenaPage() {
  return (
    <div className="container py-10 sm:py-14 max-w-2xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">¿Cómo fue tu experiencia?</h1>
        <p className="text-muted-foreground">
          Gracias por visitarnos. Cuéntanos cómo te fue — tu opinión ayuda a otros clientes.
        </p>
      </header>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ReviewForm />
        </CardContent>
      </Card>
    </div>
  );
}
