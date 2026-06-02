import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "¡Bienvenido al club!" };

export default function MembresiaExitoPage() {
  return (
    <div className="container py-20 max-w-lg text-center">
      <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-3">¡Bienvenido al club! 🎉</h1>
      <p className="text-muted-foreground mb-8">
        Tu membresía está activa. El descuento se aplicará automáticamente cada vez que reserves
        con el teléfono que registraste.
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
