import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSiteConfig } from "@/lib/server-fetch";

export const metadata = { title: "Sobre nosotros" };

export default async function SobrePage() {
  const config = await fetchSiteConfig();

  return (
    <div className="container py-8 sm:py-12 max-w-4xl">
      <header className="text-center mb-8 sm:mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Nuestra historia
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
          {config.aboutTitle ?? `Conoce ${config.spaName}`}
        </h1>
      </header>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {config.aboutImageUrl && (
          <div
            className="aspect-[4/5] rounded-2xl bg-cover bg-center order-first md:order-last"
            style={{ backgroundImage: `url('${config.aboutImageUrl}')` }}
          />
        )}
        <div className={config.aboutImageUrl ? "" : "md:col-span-2"}>
          {config.aboutText ? (
            <div className="prose prose-lg max-w-none">
              {config.aboutText.split("\n").map((p, i) =>
                p.trim() ? (
                  <p key={i} className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
                    {p}
                  </p>
                ) : null
              )}
            </div>
          ) : (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {config.tagline}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/reservar">Reserva tu cita</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/servicios">Ver servicios</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
