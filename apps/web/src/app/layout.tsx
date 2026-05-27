import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { fetchTheme, fetchSiteConfig } from "@/lib/server-fetch";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spa-web-eta.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchSiteConfig();
  const title = config.spaName;
  const description = config.tagline;
  const ogImage = config.heroImageUrl ?? config.logoUrl ?? undefined;

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    icons: {
      icon: config.logoUrl ?? "/favicon.ico",
      apple: config.logoUrl ?? undefined,
    },
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: APP_URL,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : undefined,
      locale: "es",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: { index: true, follow: true },
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
