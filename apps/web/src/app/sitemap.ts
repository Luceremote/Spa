import type { MetadataRoute } from "next";
import { fetchServices } from "@/lib/server-fetch";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spa-web-eta.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await fetchServices();
  const now = new Date();

  const staticRoutes = [
    "",
    "/servicios",
    "/sobre",
    "/galeria",
    "/resenas",
    "/gift-cards",
    "/reservar",
    "/mis-reservas",
    "/contacto",
    "/politicas/cancelacion",
    "/politicas/privacidad",
    "/politicas/terminos",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1.0 : path === "/servicios" || path === "/reservar" ? 0.9 : 0.7,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((s: any) => ({
    url: `${APP_URL}/servicios/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...serviceEntries];
}
