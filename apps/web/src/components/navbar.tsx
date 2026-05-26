"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteConfig } from "@/lib/types";

interface Props {
  config: SiteConfig;
}

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/reservar", label: "Reservar" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/mis-reservas", label: "Mis reservas" },
  { href: "/contacto", label: "Contacto" },
];

export function Navbar({ config }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt={config.spaName} className="h-9 w-auto" />
          ) : (
            <span className="text-xl font-semibold tracking-tight text-primary">
              {config.spaName}
            </span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm">
            <Link href="/reservar">Reserva ahora</Link>
          </Button>
        </nav>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t bg-background">
          <div className="container py-4 flex flex-col gap-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base py-2"
              >
                {l.label}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <Link href="/reservar" onClick={() => setOpen(false)}>
                Reserva ahora
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
