import {
  Mail,
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchSiteConfig } from "@/lib/server-fetch";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  );
}

const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

export default async function ContactoPage() {
  const config = await fetchSiteConfig();
  const waUrl = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`;

  // Google bloquea en iframe las URLs normales de Maps (X-Frame-Options).
  // Solo funcionan las de "embed". Si el admin pegó una URL de embed válida la usamos;
  // de lo contrario generamos un embed a partir de la dirección (no requiere API key ni se bloquea).
  const isEmbedUrl =
    !!config.googleMapsUrl &&
    (config.googleMapsUrl.includes("output=embed") ||
      config.googleMapsUrl.includes("/maps/embed"));
  const mapEmbed = isEmbedUrl
    ? config.googleMapsUrl
    : config.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(config.address)}&z=16&output=embed`
    : null;

  return (
    <div className="container py-8 sm:py-12 max-w-5xl">
      <header className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contáctanos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Estamos aquí para atenderte
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Tarjetas de datos */}
        <div className="space-y-4">
          {config.address && (
            <Card>
              <CardContent className="p-5 sm:p-6 flex gap-4">
                <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Dirección</h3>
                  <p className="text-sm text-muted-foreground">{config.address}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-5 sm:p-6 flex gap-4">
              <MessageCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-2">+{config.whatsappPhone}</p>
                <Button asChild size="sm">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    Abrir chat
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
          {config.callPhone && (
            <Card>
              <CardContent className="p-5 sm:p-6 flex gap-4">
                <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Teléfono</h3>
                  <p className="text-sm text-muted-foreground mb-2">{config.callPhone}</p>
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${config.callPhone}`}>Llamar</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {config.email && (
            <Card>
              <CardContent className="p-5 sm:p-6 flex gap-4">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Email</h3>
                  <a
                    href={`mailto:${config.email}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {config.email}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mapa + horarios */}
        <div className="space-y-4">
          {mapEmbed && (
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <iframe
                  src={mapEmbed}
                  className="w-full h-72 sm:h-96 border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación"
                />
              </CardContent>
            </Card>
          )}
          {(config.hoursByDay || config.openingHours) && (
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Horarios
                </h3>
                {config.hoursByDay && Object.values(config.hoursByDay).some(Boolean) ? (
                  <ul className="space-y-1.5 text-sm">
                    {DAYS.map(({ key, label }) => {
                      const v = config.hoursByDay?.[key];
                      return (
                        <li key={key} className="flex justify-between border-b last:border-0 py-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{v || "Cerrado"}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm">{config.openingHours}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Redes sociales */}
      {(config.instagramUrl || config.facebookUrl || config.tiktokUrl || config.twitterUrl || config.youtubeUrl) && (
        <Card className="bg-primary/5">
          <CardContent className="p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Síguenos</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Mantente al día con nuestros últimos tratamientos y promociones
            </p>
            <div className="flex justify-center gap-3">
              {config.instagramUrl && (
                <SocialLink href={config.instagramUrl} label="Instagram"><Instagram className="h-5 w-5" /></SocialLink>
              )}
              {config.facebookUrl && (
                <SocialLink href={config.facebookUrl} label="Facebook"><Facebook className="h-5 w-5" /></SocialLink>
              )}
              {config.tiktokUrl && (
                <SocialLink href={config.tiktokUrl} label="TikTok"><TikTokIcon className="h-5 w-5" /></SocialLink>
              )}
              {config.twitterUrl && (
                <SocialLink href={config.twitterUrl} label="Twitter / X"><Twitter className="h-5 w-5" /></SocialLink>
              )}
              {config.youtubeUrl && (
                <SocialLink href={config.youtubeUrl} label="YouTube"><Youtube className="h-5 w-5" /></SocialLink>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-12 h-12 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
    >
      {children}
    </a>
  );
}
