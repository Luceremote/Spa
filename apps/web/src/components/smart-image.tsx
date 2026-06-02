import Image, { type ImageProps } from "next/image";
import { API_BASE } from "@/lib/api";

// Envuelve next/image resolviendo URLs relativas del API (/uploads/...) a
// absolutas, y desactiva la optimización para orígenes no-https (dev local),
// donde el optimizador de Next no puede acceder. En producción (R2, https)
// sí optimiza: AVIF/WebP, srcset responsivo y lazy-load.
type Props = Omit<ImageProps, "src"> & { src: string | null | undefined };

export function SmartImage({ src, alt, ...rest }: Props) {
  if (!src) return null;
  const resolved = src.startsWith("http") ? src : `${API_BASE}${src}`;
  const unoptimized = !resolved.startsWith("https://");
  return <Image src={resolved} alt={alt} unoptimized={unoptimized} {...rest} />;
}
