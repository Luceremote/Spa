import { fetchPhotos } from "@/lib/server-fetch";
import { Camera } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import type { Photo } from "@/lib/types";

export const metadata = { title: "Galería" };

export default async function GaleriaPage() {
  const photos: Photo[] = await fetchPhotos();

  return (
    <div className="container py-8 sm:py-12">
      <header className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Galería</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Conoce nuestro espacio y los resultados de nuestros tratamientos.
        </p>
      </header>

      {photos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Pronto compartiremos más fotos por aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-lg aspect-square">
              <SmartImage
                src={p.url}
                alt={p.caption ?? "Foto del spa"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {p.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
