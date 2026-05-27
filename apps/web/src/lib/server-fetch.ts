import type { Theme, SiteConfig } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// Defaults para que la web no se rompa si el API no está corriendo
const DEFAULT_THEME: Theme = {
  id: "singleton",
  colorPrimary: "340 75% 55%",
  colorSecondary: "160 40% 70%",
  colorAccent: "45 90% 70%",
  colorBackground: "30 40% 98%",
  colorForeground: "220 15% 20%",
  colorMuted: "30 20% 92%",
  colorHeader: "30 40% 98%",
  borderRadius: "0.75rem",
  cardPadding: "1.5rem",
  containerWidth: "1200px",
  fontFamily: "Inter",
  fontSizeBase: "16px",
  template: "elegant",
};

const DEFAULT_CONFIG: SiteConfig = {
  id: "singleton",
  spaName: "Mi Spa",
  tagline: "Relájate, eres bienvenido",
  logoUrl: null,
  heroImageUrl: null,
  whatsappPhone: "15555555555",
  whatsappMsg: "Hola, me gustaría reservar un servicio",
  callPhone: null,
  email: null,
  address: null,
  googleMapsUrl: null,
  openingHours: null,
  hoursByDay: null,
  aboutTitle: null,
  aboutText: null,
  aboutImageUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  twitterUrl: null,
  youtubeUrl: null,
  cancellationPolicy: null,
  privacyPolicy: null,
  termsOfService: null,
};

export async function fetchTheme(): Promise<Theme> {
  try {
    const res = await fetch(`${API_URL}/theme`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_THEME;
    const data = await res.json();
    return data.theme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${API_URL}/site-config`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_CONFIG;
    const data = await res.json();
    return data.config ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function fetchServices(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/services`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services ?? [];
  } catch {
    return [];
  }
}

export async function fetchCategories(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories ?? [];
  } catch {
    return [];
  }
}

export async function fetchServiceBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/services/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.service ?? null;
  } catch {
    return null;
  }
}

export async function fetchPhotos(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/photos`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.photos ?? [];
  } catch {
    return [];
  }
}

export async function fetchReviews(opts: { featured?: boolean; limit?: number } = {}): Promise<any[]> {
  try {
    const q = new URLSearchParams();
    if (opts.featured) q.set("featured", "true");
    if (opts.limit) q.set("limit", String(opts.limit));
    const url = `${API_URL}/reviews${q.toString() ? "?" + q.toString() : ""}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews ?? [];
  } catch {
    return [];
  }
}
