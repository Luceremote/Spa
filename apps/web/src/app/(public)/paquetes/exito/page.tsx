import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Compra confirmada" };

export default function PaqueteExitoPage() {
  return (
    <div className="container py-20 max-w-lg text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-3">¡Compra recibida!</h1>
      <p className="text-muted-foreground mb-8">
        Procesaremos tu pago en unos segundos. Te enviaremos un email cuando esté listo y podrás
        usar tus sesiones al reservar.
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link href="/reservar">Reservar ahora</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
