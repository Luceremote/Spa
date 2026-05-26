import Link from "next/link";
import { Sparkles, Calendar, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hero } from "@/components/landing/hero";
import {
  fetchServices,
  fetchSiteConfig,
  fetchCategories,
  fetchTheme,
} from "@/lib/server-fetch";
import { formatMoney } from "@/lib/utils";
import type { Service, Category } from "@/lib/types";

export default async function HomePage() {
  const [services, config, categories, theme] = await Promise.all([
    fetchServices(),
    fetchSiteConfig(),
    fetchCategories(),
    fetchTheme(),
  ]);
  const featured: Service[] = services.filter((s: Service) => s.featured).slice(0, 3);

  return (
    <>
      <Hero config={config} template={theme.template} />

      {/* CÓMO FUNCIONA */}
      <section className="container py-16">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Cómo funciona</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Reserva tu momento de bienestar en 3 pasos</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "Elige tu servicio", desc: "Explora nuestro menú de tratamientos." },
            { icon: Calendar, title: "Reserva tu fecha", desc: "Selecciona día y hora disponibles." },
            { icon: CreditCard, title: "Paga seguro", desc: "Con tarjeta de crédito o débito vía Stripe." },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* SERVICIOS DESTACADOS */}
      {featured.length > 0 && (
        <section className="container py-16">
          <div className="flex flex-wrap items-end justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Servicios destacados</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Lo más solicitado por nuestros clientes</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/servicios">Ver todos →</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((s) => (
              <Card key={s.id} className="overflow-hidden group">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={{
                    backgroundImage: s.imageUrl
                      ? `url('${s.imageUrl}')`
                      : "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.25))",
                  }}
                />
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {formatMoney(s.priceCents)}
                    </span>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/servicios/${s.slug}`}>Ver más →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORÍAS */}
      {categories.length > 0 && (
        <section className="bg-muted/40 py-16">
          <div className="container">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Categorías</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Encuentra el tratamiento ideal</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {categories.map((c: Category) => (
                <Link
                  key={c.id}
                  href={`/servicios?cat=${c.slug}`}
                  className="spa-card hover:shadow-md transition-shadow text-center"
                >
                  <h3 className="font-semibold mb-1">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c._count?.services ?? 0} servicios
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA WHATSAPP */}
      <section className="container py-16">
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6 sm:p-10 text-center">
            <MessageSquare className="h-10 sm:h-12 w-10 sm:w-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-3">¿Tienes preguntas?</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Escríbenos directamente por WhatsApp y te atenderemos al instante.
            </p>
            <Button asChild size="lg">
              <a
                href={`https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Hablar por WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
