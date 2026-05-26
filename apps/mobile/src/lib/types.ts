export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  imageUrl: string | null;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  _count?: { services: number };
}

export interface Theme {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorForeground: string;
  colorMuted: string;
  borderRadius: string;
  fontFamily: string;
  template: "elegant" | "modern" | "minimal" | "luxury";
}

export interface SiteConfig {
  spaName: string;
  tagline: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  whatsappPhone: string;
  whatsappMsg: string;
  email: string | null;
  address: string | null;
  openingHours: string | null;
}

export interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  priceCents: number;
  status: string;
  service?: Service;
}
