import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteConfig, Theme } from "@/lib/types";

interface Props {
  config: SiteConfig;
  template: Theme["template"];
}

export function Hero({ config, template }: Props) {
  const heroBg = config.heroImageUrl
    ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${config.heroImageUrl}') center/cover`
    : "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--secondary)/0.25))";
  const onImage = !!config.heroImageUrl;

  if (template === "minimal") {
    return (
      <section className="container py-16 md:py-32">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight mb-4 sm:mb-6 leading-[1.05]">
            {config.spaName}.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg">
            {config.tagline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/reservar">Reservar →</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/servicios">Ver servicios</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (template === "luxury") {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: heroBg }} />
        <div className="container py-20 sm:py-28 md:py-44 text-center">
          <p
            className={`uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[10px] sm:text-xs mb-4 sm:mb-6 ${
              onImage ? "text-white/80" : "text-primary"
            }`}
          >
            ✦ Experiencia exclusiva ✦
          </p>
          <h1
            className={`text-4xl sm:text-5xl md:text-7xl font-serif italic mb-4 sm:mb-6 leading-tight ${
              onImage ? "text-white" : "text-foreground"
            }`}
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            {config.spaName}
          </h1>
          <p
            className={`text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-xl mx-auto ${
              onImage ? "text-white/90" : "text-muted-foreground"
            }`}
          >
            {config.tagline}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 sm:px-10"
          >
            <Link href="/reservar">RESERVAR</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (template === "modern") {
    return (
      <section className="container py-12 sm:py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 sm:mb-6 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Nuevo
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 sm:mb-4 leading-tight">
              {config.spaName}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
              {config.tagline}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/reservar">
                  Reservar <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/servicios">Ver menú</Link>
              </Button>
            </div>
          </div>
          <div
            className="aspect-square rounded-2xl sm:rounded-3xl bg-cover bg-center shadow-2xl order-first md:order-last"
            style={{
              backgroundImage: config.heroImageUrl
                ? `url('${config.heroImageUrl}')`
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
        </div>
      </section>
    );
  }

  // elegant (default)
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: heroBg }} />
      <div className="container py-16 sm:py-24 md:py-36 text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/30 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <Sparkles className="h-4 w-4" /> Bienvenido a {config.spaName}
        </span>
        <h1
          className={`text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight ${
            onImage ? "text-white" : "text-foreground"
          }`}
        >
          {config.tagline}
        </h1>
        <p
          className={`max-w-2xl mx-auto mb-8 sm:mb-10 text-base sm:text-lg ${
            onImage ? "text-white/90" : "text-muted-foreground"
          }`}
        >
          Descubre nuestros servicios de spa y wellness diseñados para tu bienestar.
        </p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <Button asChild size="lg">
            <Link href="/servicios">
              Ver servicios <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/reservar">Reservar cita</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
