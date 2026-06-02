"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getT, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import type { SiteConfig } from "@/lib/types";

interface Props {
  config: SiteConfig;
  locale?: Locale;
}

export const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Inicio", visible: true },
  { href: "/servicios", label: "Servicios", visible: true },
  { href: "/sobre", label: "Sobre", visible: true },
  { href: "/galeria", label: "Galería", visible: true },
  { href: "/resenas", label: "Reseñas", visible: true },
  { href: "/gift-cards", label: "Gift Cards", visible: true },
  { href: "/paquetes", label: "Paquetes", visible: true },
  { href: "/membresias", label: "Membresías", visible: true },
  { href: "/mis-reservas", label: "Mis reservas", visible: true },
  { href: "/saldo", label: "Consultar saldo", visible: true },
  { href: "/contacto", label: "Contacto", visible: true },
];

export function Navbar({ config, locale = DEFAULT_LOCALE }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = getT(locale);

  const LINKS = (
    config.navLinks && config.navLinks.length > 0 ? config.navLinks : DEFAULT_NAV_LINKS
  ).filter((l) => l.visible);

  // Cerrar drawer al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const Logo = (
    <Link href="/" className="flex items-center gap-2 min-w-0">
      {config.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.logoUrl} alt={config.spaName} className="h-8 sm:h-9 w-auto" />
      ) : (
        <span className="text-lg sm:text-xl font-semibold tracking-tight text-primary truncate">
          {config.spaName}
        </span>
      )}
    </Link>
  );

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/80">
      <div className="container flex h-16 items-center justify-between gap-3">
        {Logo}

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-sm font-medium transition-colors relative py-1",
                  active ? "text-primary" : "text-foreground/75 hover:text-primary"
                )}
              >
                {l.label}
                {active && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
          <LocaleSwitcher current={locale} />
          <Button asChild size="sm">
            <Link href="/reservar">{t("hero.book")}</Link>
          </Button>
        </nav>

        {/* Mobile: botón reservar + hamburguesa */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/reservar">{t("nav.book")}</Link>
          </Button>
          <button
            className="p-2 -mr-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>

      {/* Drawer móvil — FUERA del <header> porque su backdrop-blur crea un
          containing block que atraparía el position:fixed y lo dejaría invisible */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

        {/* Panel */}
        <aside
          className={cn(
            "absolute inset-y-0 right-0 w-[78%] max-w-xs bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b">
            <span className="font-semibold text-primary truncate">{config.spaName}</span>
            <button
              onClick={() => setOpen(false)}
              className="p-2 -mr-2 rounded-md hover:bg-muted"
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center px-5 py-3.5 text-base border-l-4 transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-transparent text-foreground/80 hover:bg-muted"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-3">
            <div className="flex justify-center">
              <LocaleSwitcher current={locale} />
            </div>
            <Button asChild size="lg" className="w-full">
              <Link href="/reservar">{t("hero.book")}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
