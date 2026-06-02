// i18n ligero basado en cookie (sin reestructurar rutas). El contenido autoría
// del admin (servicios, reseñas) no se traduce; sí la interfaz del sitio público.
export type Locale = "es" | "en";

export const LOCALE_COOKIE = "spa_locale";
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en"];

export function normalizeLocale(v?: string | null): Locale {
  return v === "en" ? "en" : "es";
}

type Dict = Record<string, string>;

const es: Dict = {
  "nav.book": "Reservar",
  "nav.language": "Idioma",
  "hero.welcome": "Bienvenido",
  "hero.book": "Reservar ahora",
  "home.how.title": "Cómo funciona",
  "home.how.subtitle": "Reserva tu momento de bienestar en 3 pasos",
  "home.how.s1.title": "Elige tu servicio",
  "home.how.s1.desc": "Explora nuestro menú de tratamientos.",
  "home.how.s2.title": "Reserva tu fecha",
  "home.how.s2.desc": "Selecciona día y hora disponibles.",
  "home.how.s3.title": "Paga seguro",
  "home.how.s3.desc": "Con tarjeta de crédito o débito vía Stripe.",
  "home.featured.title": "Servicios destacados",
  "home.featured.subtitle": "Lo más solicitado por nuestros clientes",
  "home.featured.all": "Ver todos →",
  "home.categories.title": "Categorías",
  "home.categories.subtitle": "Encuentra el tratamiento ideal",
  "home.categories.count": "servicios",
  "home.save.title": "Ahorra más",
  "home.save.subtitle": "Compra paquetes de sesiones o únete a nuestro club con descuentos permanentes",
  "home.save.packages": "Paquetes",
  "home.save.packages.cta": "Ver paquetes",
  "home.save.memberships": "Membresías",
  "home.save.memberships.cta": "Conocer el club",
  "home.save.month": "/mes",
  "home.save.sessions": "sesiones",
  "home.save.discount": "dto.",
  "home.about.badge": "Sobre nosotros",
  "home.about.more": "Leer más",
  "footer.rights": "Todos los derechos reservados.",
};

const en: Dict = {
  "nav.book": "Book",
  "nav.language": "Language",
  "hero.welcome": "Welcome",
  "hero.book": "Book now",
  "home.how.title": "How it works",
  "home.how.subtitle": "Book your moment of wellness in 3 steps",
  "home.how.s1.title": "Choose your service",
  "home.how.s1.desc": "Browse our menu of treatments.",
  "home.how.s2.title": "Pick a date",
  "home.how.s2.desc": "Select an available day and time.",
  "home.how.s3.title": "Pay securely",
  "home.how.s3.desc": "By credit or debit card via Stripe.",
  "home.featured.title": "Featured services",
  "home.featured.subtitle": "Our clients' favorites",
  "home.featured.all": "See all →",
  "home.categories.title": "Categories",
  "home.categories.subtitle": "Find the perfect treatment",
  "home.categories.count": "services",
  "home.save.title": "Save more",
  "home.save.subtitle": "Buy session packages or join our club for permanent discounts",
  "home.save.packages": "Packages",
  "home.save.packages.cta": "View packages",
  "home.save.memberships": "Memberships",
  "home.save.memberships.cta": "Discover the club",
  "home.save.month": "/mo",
  "home.save.sessions": "sessions",
  "home.save.discount": "off",
  "home.about.badge": "About us",
  "home.about.more": "Read more",
  "footer.rights": "All rights reserved.",
};

const DICTS: Record<Locale, Dict> = { es, en };

// Devuelve una función t(key) para el locale dado (fallback a la clave o ES).
export function getT(locale: Locale) {
  const d = DICTS[locale] ?? es;
  return (key: keyof typeof es | string): string => d[key] ?? es[key] ?? String(key);
}

export type TFn = ReturnType<typeof getT>;
