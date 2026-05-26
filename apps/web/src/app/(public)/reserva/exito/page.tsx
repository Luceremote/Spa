import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { booking?: string };
}) {
  return (
    <div className="container py-20 max-w-lg">
      <Card>
        <CardContent className="pt-10 text-center">
          <CheckCircle2 className="h-20 w-20 mx-auto text-green-500 mb-6" />
          <h1 className="text-3xl font-bold mb-3">¡Pago confirmado!</h1>
          <p className="text-muted-foreground mb-8">
            Hemos recibido tu pago correctamente. Tu reserva está confirmada y te esperamos en la
            fecha agendada.
          </p>
          {searchParams.booking && (
            <p className="text-xs text-muted-foreground mb-6">
              Referencia: {searchParams.booking}
            </p>
          )}
          <Button asChild size="lg">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
