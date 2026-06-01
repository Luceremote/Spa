"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { PromoBanner } from "@/lib/types";

interface Props {
  banner: PromoBanner | null;
}

const DISMISSED_KEY = "spa_banner_dismissed";

export function PromoBannerClient({ banner }: Props) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!banner || !banner.active || !banner.text) {
      setHidden(true);
      return;
    }
    // Persistir dismissal por hash del contenido (si cambia el banner, reaparece)
    const hash = banner.text + banner.ctaUrl;
    if (banner.dismissible && localStorage.getItem(DISMISSED_KEY) === hash) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  }, [banner]);

  if (!banner || hidden || !banner.text) return null;

  function dismiss() {
    setHidden(true);
    localStorage.setItem(DISMISSED_KEY, banner!.text + banner!.ctaUrl);
  }

  return (
    <div
      className="w-full text-center text-sm py-2 px-4 flex items-center justify-center gap-3 relative"
      style={{
        background: `hsl(${banner.bgColor})`,
        color: `hsl(${banner.textColor})`,
      }}
    >
      <span className="font-medium">{banner.text}</span>
      {banner.ctaLabel && banner.ctaUrl && (
        <Link
          href={banner.ctaUrl}
          className="underline font-semibold hover:no-underline whitespace-nowrap"
        >
          {banner.ctaLabel}
        </Link>
      )}
      {banner.dismissible && (
        <button
          onClick={dismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
