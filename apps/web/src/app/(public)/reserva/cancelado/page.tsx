import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CancelPage({
  searchParams,
}: {
  searchParams: { booking?: string };
}) {
  return (
    <div className="container py-20 max-w-lg">
      <Card>
        <CardContent className="pt-10 text-center">
          <XCircle className="h-20 w-20 mx-auto text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-3">Pago cancelado</h1>
          <p className="text-muted-foreground mb-8">
            No se completó el pago. Tu reserva sigue creada en estado pendiente; puedes intentar
            pagar de nuevo o contactarnos por WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">Volver al inicio</Link>
            </Button>
            <Button asChild>
              <Link href="/reservar">Intentar otra reserva</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
