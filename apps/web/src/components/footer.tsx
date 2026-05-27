import Link from "next/link";
import { MapPin, Clock, Mail, Phone, MessageCircle, Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter";
import type { SiteConfig } from "@/lib/types";

interface Props {
  config: SiteConfig;
}

const DAYS_ORDER: { key: keyof NonNullable<SiteConfig["hoursByDay"]>; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

// Logo TikTok (lucide no lo trae)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
    </svg>
  );
}

export function Footer({ config }: Props) {
  const year = new Date().getFullYear();
  const hasAnySocial =
    config.instagramUrl || config.facebookUrl || config.tiktokUrl || config.twitterUrl || config.youtubeUrl;

  return (
    <footer className="border-t bg-muted/40 mt-16">
      {/* Newsletter banner */}
      <div className="border-b bg-primary/5">
        <div className="container py-8 sm:py-10 grid md:grid-cols-2 gap-4 items-center">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-1">Recibe nuestras promos</h3>
            <p className="text-sm text-muted-foreground">
              Suscríbete para enterarte primero de descuentos y novedades.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="container py-10 sm:py-12 grid gap-8 md:grid-cols-3">
        {/* Identidad + redes */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">{config.spaName}</h3>
          <p className="text-sm text-muted-foreground mb-4">{config.tagline}</p>
          {hasAnySocial && (
            <div className="flex gap-3">
              {config.instagramUrl && (
                <a
                  href={config.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {config.facebookUrl && (
                <a
                  href={config.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {config.tiktokUrl && (
                <a
                  href={config.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
              {config.twitterUrl && (
                <a
                  href={config.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  className="w-9 h-9 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {config.youtubeUrl && (
                <a
                  href={config.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Contacto */}
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold mb-3">Contacto</h4>
          {config.address && (
            <p className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>{config.address}</span>
            </p>
          )}
          {config.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <a href={`mailto:${config.email}`} className="hover:text-primary">{config.email}</a>
            </p>
          )}
          {config.callPhone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
              <a href={`tel:${config.callPhone}`} className="hover:text-primary">{config.callPhone}</a>
            </p>
          )}
          <p className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary flex-shrink-0" />
            <a
              href={`https://wa.me/${config.whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              WhatsApp +{config.whatsappPhone}
            </a>
          </p>
        </div>

        {/* Horarios */}
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Horarios
          </h4>
          {config.hoursByDay && Object.values(config.hoursByDay).some(Boolean) ? (
            <ul className="space-y-1">
              {DAYS_ORDER.map(({ key, label }) => {
                const value = config.hoursByDay?.[key];
                if (!value) return null;
                return (
                  <li key={key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </li>
                );
              })}
            </ul>
          ) : config.openingHours ? (
            <p>{config.openingHours}</p>
          ) : (
            <p className="text-muted-foreground">Consultar horarios</p>
          )}
        </div>
      </div>

      {/* Links legales */}
      <div className="border-t">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {year} {config.spaName}. Todos los derechos reservados.</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/politicas/cancelacion" className="hover:text-primary">Política de cancelación</Link>
            <Link href="/politicas/privacidad" className="hover:text-primary">Privacidad</Link>
            <Link href="/politicas/terminos" className="hover:text-primary">Términos</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
