import Link from "next/link";
import { CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GiftCardSuccessPage() {
  return (
    <div className="container py-12 sm:py-20 max-w-lg">
      <Card>
        <CardContent className="pt-8 sm:pt-10 px-6 sm:px-10 pb-8 sm:pb-10 text-center">
          <div className="relative inline-block mb-6">
            <Gift className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />
            <CheckCircle2 className="h-8 w-8 absolute -bottom-1 -right-1 text-green-500 bg-card rounded-full" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">¡Gift card enviada!</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-8">
            El destinatario recibirá un email con el código y las instrucciones para canjear.
            Tú recibirás también un recibo en tu correo.
          </p>
          <Button asChild size="lg">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
