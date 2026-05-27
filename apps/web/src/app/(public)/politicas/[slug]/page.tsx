import { notFound } from "next/navigation";
import { fetchSiteConfig } from "@/lib/server-fetch";

const TITLES: Record<string, string> = {
  cancelacion: "Política de cancelación",
  privacidad: "Política de privacidad",
  terminos: "Términos y condiciones",
};

const DEFAULTS: Record<string, string> = {
  cancelacion:
    "Para cancelar o reprogramar una cita, te pedimos avisarnos con al menos 24 horas de antelación. Cancelaciones tardías o no presentarse a la cita pueden estar sujetas a cargos.",
  privacidad:
    "Respetamos tu privacidad. La información que nos compartes (nombre, contacto, datos de pago) se usa únicamente para gestionar tu reserva y mejorar tu experiencia. No vendemos ni cedemos tus datos a terceros. Los pagos se procesan a través de proveedores certificados (Stripe) y no almacenamos información de tarjetas en nuestros servidores.",
  terminos:
    "Al utilizar nuestros servicios y reservar a través de este sitio aceptas las condiciones de uso. Nos reservamos el derecho de modificar precios, disponibilidad y políticas con previo aviso. Para cualquier consulta, contáctanos por los canales indicados.",
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: TITLES[params.slug] ?? "Política" };
}

export default async function PoliticaPage({ params }: { params: { slug: string } }) {
  const title = TITLES[params.slug];
  if (!title) notFound();

  const config = await fetchSiteConfig();
  const content =
    params.slug === "cancelacion"
      ? config.cancellationPolicy
      : params.slug === "privacidad"
      ? config.privacyPolicy
      : config.termsOfService;

  const text = content?.trim() || DEFAULTS[params.slug];

  return (
    <div className="container py-8 sm:py-12 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">{title}</h1>
      <div className="prose prose-lg max-w-none">
        {text!.split("\n").map((p, i) =>
          p.trim() ? (
            <p key={i} className="text-base text-muted-foreground leading-relaxed mb-4">
              {p}
            </p>
          ) : null
        )}
      </div>
      <p className="mt-12 text-xs text-muted-foreground">
        Última actualización: {new Date().toLocaleDateString("es-US", { dateStyle: "long" })}
      </p>
    </div>
  );
}
