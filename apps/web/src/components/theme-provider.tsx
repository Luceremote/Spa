"use client";

import { useEffect } from "react";
import type { Theme, SiteConfig } from "@/lib/types";

interface Props {
  theme: Theme;
  config: SiteConfig;
  children: React.ReactNode;
}

const FONT_HREFS: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "Playfair Display":
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  Poppins:
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  Lora: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
};

export function ThemeProvider({ theme, config, children }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--background", theme.colorBackground);
    root.style.setProperty("--foreground", theme.colorForeground);
    root.style.setProperty("--primary", theme.colorPrimary);
    root.style.setProperty("--secondary", theme.colorSecondary);
    root.style.setProperty("--accent", theme.colorAccent);
    root.style.setProperty("--muted", theme.colorMuted);
    root.style.setProperty("--card", theme.colorBackground);
    root.style.setProperty("--card-foreground", theme.colorForeground);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--secondary-foreground", theme.colorForeground);
    root.style.setProperty("--accent-foreground", theme.colorForeground);
    root.style.setProperty("--muted-foreground", "220 10% 45%");
    root.style.setProperty("--border", theme.colorMuted);
    root.style.setProperty("--input", theme.colorMuted);
    root.style.setProperty("--ring", theme.colorPrimary);
    root.style.setProperty("--radius", theme.borderRadius);
    root.style.setProperty("--container-width", theme.containerWidth);
    root.style.setProperty("--card-padding", theme.cardPadding);
    root.style.setProperty("--font-sans", `"${theme.fontFamily}", system-ui, sans-serif`);
    document.body.style.fontSize = theme.fontSizeBase;
    document.title = config.spaName;

    // Cargar fuente Google si no está
    const href = FONT_HREFS[theme.fontFamily];
    if (href && !document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [theme, config.spaName]);

  return <>{children}</>;
}
