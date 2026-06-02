import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { fetchServiceBySlug } from "@/lib/server-fetch";
import { formatMoney } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spa-web-eta.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = await fetchServiceBySlug(params.slug);
  if (!service) return { title: "Servicio no encontrado" };
  const description = service.description?.slice(0, 160) ?? undefined;
  return {
    title: service.name,
    description,
    alternates: { canonical: `${APP_URL}/servicios/${service.slug}` },
    openGraph: {
      title: service.name,
      description,
      url: `${APP_URL}/servicios/${service.slug}`,
      images: service.imageUrl ? [{ url: service.imageUrl }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await fetchServiceBySlug(params.slug);
  if (!service) notFound();

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    ...(service.imageUrl ? { image: service.imageUrl } : {}),
    ...(service.category?.name ? { serviceType: service.category.name } : {}),
    url: `${APP_URL}/servicios/${service.slug}`,
    offers: {
      "@type": "Offer",
      price: (service.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: service.active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${APP_URL}/reservar?service=${service.id}`,
    },
  };

  return (
    <div className="container py-8 sm:py-12">
      <JsonLd data={serviceLd} />
      <Link
        href="/servicios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 sm:mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Todos los servicios
      </Link>

      <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-start">
        <div
          className="aspect-square rounded-lg bg-cover bg-center"
          style={{
            backgroundImage: service.imageUrl
              ? `url('${service.imageUrl}')`
              : "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.25))",
          }}
        />

        <div>
          {service.category && (
            <span className="text-xs sm:text-sm text-primary font-medium uppercase tracking-wide">
              {service.category.name}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2 mb-3 sm:mb-4">{service.name}</h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-5 sm:mb-6 leading-relaxed">
            {service.description}
          </p>

          <div className="flex items-center gap-6 mb-8 p-4 bg-muted/40 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Duración</p>
              <p className="font-semibold flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4" /> {service.durationMinutes} min
              </p>
            </div>
            <div className="border-l h-10" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Precio</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatMoney(service.priceCents)}
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/reservar?service=${service.id}`}>Reservar este servicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
