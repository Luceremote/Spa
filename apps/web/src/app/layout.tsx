import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { fetchTheme, fetchSiteConfig } from "@/lib/server-fetch";

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchSiteConfig();
  return {
    title: config.spaName,
    description: config.tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, config] = await Promise.all([fetchTheme(), fetchSiteConfig()]);
  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme} config={config}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
