import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchServices, fetchCategories } from "@/lib/server-fetch";
import { formatMoney } from "@/lib/utils";
import type { Service, Category } from "@/lib/types";

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const [services, categories] = await Promise.all([fetchServices(), fetchCategories()]);
  const filtered: Service[] = searchParams.cat
    ? services.filter((s: Service) => s.category?.slug === searchParams.cat)
    : services;

  return (
    <div className="container py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">Nuestros Servicios</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Cada tratamiento está diseñado para brindarte una experiencia única de relajación y bienestar.
        </p>
      </header>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <Link
          href="/servicios"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !searchParams.cat ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
          }`}
        >
          Todos
        </Link>
        {categories.map((c: Category) => (
          <Link
            key={c.id}
            href={`/servicios?cat=${c.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              searchParams.cat === c.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No hay servicios en esta categoría.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="overflow-hidden flex flex-col">
              <div
                className="aspect-[4/3] bg-cover bg-center"
                style={{
                  backgroundImage: s.imageUrl
                    ? `url('${s.imageUrl}')`
                    : "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.25))",
                }}
              />
              <CardContent className="p-6 flex flex-col flex-1">
                {s.category && (
                  <span className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
                    {s.category.name}
                  </span>
                )}
                <h3 className="font-semibold text-lg mb-2">{s.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                  {s.description}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {s.durationMinutes} min
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatMoney(s.priceCents)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/servicios/${s.slug}`}>Detalles</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/reservar?service=${s.id}`}>Reservar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
