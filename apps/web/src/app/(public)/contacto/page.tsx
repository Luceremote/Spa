import { Mail, MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchSiteConfig } from "@/lib/server-fetch";

export default async function ContactoPage() {
  const config = await fetchSiteConfig();
  return (
    <div className="container py-12 max-w-4xl">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Contáctanos</h1>
        <p className="text-muted-foreground">Estamos para atenderte</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {config.address && (
          <Card>
            <CardContent className="p-6 flex gap-4">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Dirección</h3>
                <p className="text-sm text-muted-foreground">{config.address}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-6 flex gap-4">
            <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Teléfono / WhatsApp</h3>
              <p className="text-sm text-muted-foreground">+{config.whatsappPhone}</p>
            </div>
          </CardContent>
        </Card>
        {config.email && (
          <Card>
            <CardContent className="p-6 flex gap-4">
              <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">{config.email}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {config.openingHours && (
          <Card>
            <CardContent className="p-6 flex gap-4">
              <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Horario</h3>
                <p className="text-sm text-muted-foreground">{config.openingHours}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-primary/5">
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-3">Chat directo por WhatsApp</h2>
          <p className="text-muted-foreground mb-6">
            La forma más rápida de comunicarte con nosotros.
          </p>
          <Button asChild size="lg">
            <a
              href={`https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
