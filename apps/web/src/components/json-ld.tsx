// Inserta datos estructurados (schema.org) como JSON-LD. Google los usa para
// mostrar estrellas, precios y datos del negocio en los resultados de búsqueda.

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // El contenido es generado por nosotros (no input de usuario sin escapar);
      // aun así escapamos "<" para evitar romper el script.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
