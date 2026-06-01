import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Compra cancelada" };

export default function PaqueteCanceladoPage() {
  return (
    <div className="container py-20 max-w-lg text-center">
      <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-3">Compra cancelada</h1>
      <p className="text-muted-foreground mb-8">
        No te preocupes, no se cobró nada. Puedes intentarlo de nuevo cuando quieras.
      </p>
      <Button asChild>
        <Link href="/paquetes">Ver paquetes</Link>
      </Button>
    </div>
  );
}
