import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GiftCardCancelPage() {
  return (
    <div className="container py-12 sm:py-20 max-w-lg">
      <Card>
        <CardContent className="pt-8 sm:pt-10 px-6 sm:px-10 pb-8 sm:pb-10 text-center">
          <XCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-destructive mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Compra cancelada</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-8">
            No se realizó ningún cobro. Puedes intentar de nuevo cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">Inicio</Link>
            </Button>
            <Button asChild>
              <Link href="/gift-cards">Volver a intentar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
