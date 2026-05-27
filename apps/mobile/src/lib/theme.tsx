import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import type { Theme, SiteConfig } from "./types";

const DEFAULT_THEME: Theme = {
  colorPrimary: "340 75% 55%",
  colorSecondary: "160 40% 70%",
  colorAccent: "45 90% 70%",
  colorBackground: "30 40% 98%",
  colorForeground: "220 15% 20%",
  colorMuted: "30 20% 92%",
  borderRadius: "12",
  fontFamily: "System",
  template: "elegant",
};

const DEFAULT_CONFIG: SiteConfig = {
  spaName: "Mi Spa",
  tagline: "Bienestar para ti",
  logoUrl: null,
  heroImageUrl: null,
  whatsappPhone: "15555555555",
  whatsappMsg: "Hola, me gustaría reservar",
  email: null,
  address: null,
  openingHours: null,
};

// Convierte "340 75% 55%" → "hsl(340, 75%, 55%)"
export function hsl(value: string, alpha = 1): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return value;
  const h = parts[0];
  const s = parts[1];
  const l = parts[2];
  return alpha === 1 ? `hsl(${h}, ${s}, ${l})` : `hsla(${h}, ${s}, ${l}, ${alpha})`;
}

interface Ctx {
  theme: Theme;
  config: SiteConfig;
  refresh: () => Promise<void>;
}

const ThemeCtx = createContext<Ctx>({
  theme: DEFAULT_THEME,
  config: DEFAULT_CONFIG,
  refresh: async () => {},
});

const CACHE_KEY = "spa_theme_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);

  async function load() {
    // 1) leer caché para arranque rápido
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.config) setConfig(parsed.config);
      }
    } catch {}
    // 2) refrescar desde API
    try {
      const [t, c] = await Promise.all([
        api<{ theme: Theme }>("/theme"),
        api<{ config: SiteConfig }>("/site-config"),
      ]);
      setTheme(t.theme);
      setConfig(c.config);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ theme: t.theme, config: c.config })).catch(() => {});
    } catch {
      // sin red: mantenemos cache/defaults
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, config, refresh: load }}>{children}</ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// Radio de bordes derivado del tema (con fallback)
export function radius(theme: Theme, scale = 1): number {
  const base = Number(String(theme.borderRadius).replace(/[^0-9.]/g, "")) || 12;
  return base * scale;
}

// Sombras consistentes para iOS + Android
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

// Espaciado consistente (escala de 4)
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
