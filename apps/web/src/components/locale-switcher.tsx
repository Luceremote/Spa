"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();

  function set(loc: Locale) {
    if (loc === current) return;
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      {LOCALES.map((loc, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && <span className="text-muted-foreground/40 mx-0.5">/</span>}
          <button
            onClick={() => set(loc)}
            className={`uppercase font-semibold px-1 rounded ${
              loc === current ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={loc === current}
          >
            {loc}
          </button>
        </span>
      ))}
    </div>
  );
}
