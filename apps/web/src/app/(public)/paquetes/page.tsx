import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { BuyPackageForm } from "./buy-form";

export const metadata = {
  title: "Paquetes de sesiones",
  description: "Compra varias sesiones a precio reducido",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function fetchPackages() {
  try {
    const res = await fetch(`${API_URL}/packages`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.packages ?? [];
  } catch {
    return [];
  }
}

export default async function PaquetesPage() {
  const packages = await fetchPackages();

  return (
    <div className="container py-10 sm:py-14 max-w-5xl">
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Paquetes de sesiones</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Ahorra comprando varias sesiones por adelantado. Reserva cuando quieras dentro del
          período de validez.
        </p>
      </header>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Pronto tendremos paquetes disponibles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((p: any) => {
            const perSession = p.priceCents / p.sessions / 100;
            return (
              <Card key={p.id} className="flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {p.service?.name}
                  </div>
                  <h3 className="text-xl font-bold mt-1">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      ${(p.priceCents / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {p.sessions} sesiones
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${perSession.toFixed(2)} por sesión
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Validez: {p.validityDays} días desde la compra
                  </div>
                  <div className="mt-auto pt-5">
                    <BuyPackageForm packageId={p.id} packageName={p.name} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
