import Link from "next/link";
import { Sparkles, Calendar, CreditCard, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hero } from "@/components/landing/hero";
import {
  fetchServices,
  fetchSiteConfig,
  fetchCategories,
  fetchTheme,
  fetchPhotos,
} from "@/lib/server-fetch";
import { formatMoney } from "@/lib/utils";
import type { Service, Category, Photo } from "@/lib/types";

export default async function HomePage() {
  const [services, config, categories, theme, photos] = await Promise.all([
    fetchServices(),
    fetchSiteConfig(),
    fetchCategories(),
    fetchTheme(),
    fetchPhotos(),
  ]);
  const featured: Service[] = services.filter((s: Service) => s.featured).slice(0, 3);
  const galleryPreview: Photo[] = photos.slice(0, 6);

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

      {/* SOBRE NOSOTROS */}
      {(config.aboutText || config.aboutImageUrl) && (
        <section className="container py-12 sm:py-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className={config.aboutImageUrl ? "" : "md:col-span-2 max-w-2xl mx-auto text-center"}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                Sobre nosotros
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                {config.aboutTitle ?? `Conoce ${config.spaName}`}
              </h2>
              {config.aboutText && (
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-3">
                  {config.aboutText.split("\n").slice(0, 3).map((p, i) =>
                    p.trim() ? <p key={i}>{p}</p> : null
                  )}
                </div>
              )}
              <Button asChild variant="link" className="mt-4 px-0">
                <Link href="/sobre">Leer más <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            {config.aboutImageUrl && (
              <div
                className="aspect-[4/5] rounded-2xl bg-cover bg-center shadow-xl order-first md:order-last"
                style={{ backgroundImage: `url('${config.aboutImageUrl}')` }}
              />
            )}
          </div>
        </section>
      )}

      {/* GALERÍA PREVIEW */}
      {galleryPreview.length > 0 && (
        <section className="container py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Nuestro trabajo</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Resultados que hablan por sí solos</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/galeria">Ver galería completa →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {galleryPreview.map((p) => (
              <div
                key={p.id}
                className="aspect-square bg-cover bg-center rounded-lg overflow-hidden"
                style={{ backgroundImage: `url('${p.url}')` }}
              />
            ))}
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
