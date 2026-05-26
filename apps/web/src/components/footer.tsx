import { MapPin, Clock, Mail, Phone } from "lucide-react";
import type { SiteConfig } from "@/lib/types";

interface Props {
  config: SiteConfig;
}

export function Footer({ config }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="container py-12 grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">{config.spaName}</h3>
          <p className="text-sm text-muted-foreground">{config.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold mb-3">Contacto</h4>
          {config.address && (
            <p className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary" /> {config.address}
            </p>
          )}
          {config.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {config.email}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> +{config.whatsappPhone}
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold mb-3">Horario</h4>
          {config.openingHours && (
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> {config.openingHours}
            </p>
          )}
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {year} {config.spaName}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
