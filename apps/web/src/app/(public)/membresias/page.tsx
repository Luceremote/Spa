import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Check, Sparkles } from "lucide-react";

export const metadata = {
  title: "Membresías",
  description: "Únete a nuestro club y disfruta de descuentos permanentes",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function fetchTiers() {
  try {
    const res = await fetch(`${API_URL}/memberships/tiers`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tiers ?? [];
  } catch {
    return [];
  }
}

async function fetchConfig() {
  try {
    const res = await fetch(`${API_URL}/site-config`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).config;
  } catch {
    return null;
  }
}

export default async function MembresiasPage() {
  const [tiers, config] = await Promise.all([fetchTiers(), fetchConfig()]);
  const whatsapp = config?.whatsappPhone ?? "";

  return (
    <div className="container py-10 sm:py-14 max-w-5xl">
      <header className="text-center mb-10">
        <Crown className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Membresías</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Únete a nuestro club y obtén descuentos permanentes en cada reserva.
        </p>
      </header>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Pronto presentaremos nuestros planes de membresía.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiers.map((t: any) => {
            const perks = (t.perks ?? "").split("\n").filter(Boolean);
            const color = t.color ?? "#a855f7";
            const waUrl = whatsapp
              ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  `Hola, me interesa la membresía ${t.name}`
                )}`
              : null;
            return (
              <Card
                key={t.id}
                className="flex flex-col"
                style={{ borderTop: `4px solid ${color}` }}
              >
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Crown className="h-5 w-5" style={{ color }} />
                    {t.name}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                  )}
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      ${(t.monthlyPriceCents / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                  <div
                    className="text-sm font-semibold mt-1"
                    style={{ color }}
                  >
                    {t.discountPercent}% de descuento por reserva
                  </div>
                  {perks.length > 0 && (
                    <ul className="mt-5 space-y-2 text-sm">
                      {perks.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check
                            className="h-4 w-4 flex-shrink-0 mt-0.5"
                            style={{ color }}
                          />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-6">
                    {waUrl ? (
                      <Button asChild className="w-full">
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          Quiero {t.name}
                        </a>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href="/reservar">Comenzar</Link>
                      </Button>
                    )}
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
