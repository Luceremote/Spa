"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromoPopup } from "@/lib/types";

interface Props {
  popup: PromoPopup | null;
}

const SHOWN_KEY = "spa_popup_shown_at";

export function PromoPopupClient({ popup }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!popup || !popup.active) return;
    const lastShown = Number(localStorage.getItem(SHOWN_KEY) || 0);
    const daysSinceLast = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);
    if (lastShown > 0 && daysSinceLast < popup.showOncePerDays) return;

    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(SHOWN_KEY, String(Date.now()));
    }, popup.showAfterSec * 1000);
    return () => clearTimeout(timer);
  }, [popup]);

  if (!popup || !open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 bg-card/80 hover:bg-card rounded-full p-1.5"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        {popup.imageUrl && (
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url('${popup.imageUrl}')` }}
          />
        )}
        <div className="p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">{popup.title}</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">{popup.body}</p>
          <Button asChild size="lg" className="w-full">
            <Link href={popup.ctaUrl} onClick={() => setOpen(false)}>
              {popup.ctaLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
