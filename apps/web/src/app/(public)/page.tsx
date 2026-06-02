import Link from "next/link";
import { cookies } from "next/headers";
import { Sparkles, Calendar, CreditCard, MessageSquare, ArrowRight, Tag, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Hero } from "@/components/landing/hero";
import {
  fetchServices,
  fetchSiteConfig,
  fetchCategories,
  fetchTheme,
  fetchPhotos,
  fetchReviews,
  fetchPackagesPreview,
  fetchTiersPreview,
} from "@/lib/server-fetch";
import { Stars } from "@/components/stars";
import { JsonLd } from "@/components/json-ld";
import { formatMoney } from "@/lib/utils";
import type { Service, Category, Photo, Review } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spa-web-eta.vercel.app";

const DAY_MAP: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function buildOpeningHours(hoursByDay: any): any[] | undefined {
  if (!hoursByDay || typeof hoursByDay !== "object") return undefined;
  const spec: any[] = [];
  for (const [key, day] of Object.entries(DAY_MAP)) {
    const raw = hoursByDay[key];
    if (!raw || typeof raw !== "string") continue;
    const m = raw.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    spec.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens: m[1],
      closes: m[2],
    });
  }
  return spec.length ? spec : undefined;
}

export default async function HomePage() {
  const [services, config, categories, theme, photos, reviews, packages, tiers, allReviews] =
    await Promise.all([
      fetchServices(),
      fetchSiteConfig(),
      fetchCategories(),
      fetchTheme(),
      fetchPhotos(),
      fetchReviews({ featured: true, limit: 6 }),
      fetchPackagesPreview(),
      fetchTiersPreview(),
      fetchReviews({ limit: 50 }),
    ]);
  const tr = getT(normalizeLocale(cookies().get(LOCALE_COOKIE)?.value));
  const topPackages = packages.slice(0, 3);
  const topTiers = tiers.slice(0, 3);
  const featured: Service[] = services.filter((s: Service) => s.featured).slice(0, 3);
  const galleryPreview: Photo[] = photos.slice(0, 6);
  const topReviews: Review[] = reviews.slice(0, 3);
  const avgRating =
    reviews.length > 0 ? reviews.reduce((s: number, r: Review) => s + r.rating, 0) / reviews.length : 0;

  // ── Datos estructurados (LocalBusiness) para Google ──
  const social = [
    config.instagramUrl,
    config.facebookUrl,
    config.tiktokUrl,
    config.twitterUrl,
    config.youtubeUrl,
  ].filter(Boolean);
  const businessLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DaySpa",
    name: config.spaName,
    description: config.tagline,
    url: APP_URL,
    ...(config.heroImageUrl || config.logoUrl
      ? { image: config.heroImageUrl ?? config.logoUrl }
      : {}),
    ...(config.callPhone || config.whatsappPhone
      ? { telephone: config.callPhone ?? `+${config.whatsappPhone}` }
      : {}),
    ...(config.email ? { email: config.email } : {}),
    ...(config.address
      ? { address: { "@type": "PostalAddress", streetAddress: config.address } }
      : {}),
    priceRange: "$$",
    ...(social.length ? { sameAs: social } : {}),
    ...(buildOpeningHours(config.hoursByDay)
      ? { openingHoursSpecification: buildOpeningHours(config.hoursByDay) }
      : {}),
    ...(allReviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              allReviews.reduce((s: number, r: Review) => s + r.rating, 0) / allReviews.length
            ).toFixed(1),
            reviewCount: allReviews.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={businessLd} />
      <Hero config={config} template={theme.template} />

      {/* CÓMO FUNCIONA */}
      <section className="container py-16">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{tr("home.how.title")}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">{tr("home.how.subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: tr("home.how.s1.title"), desc: tr("home.how.s1.desc") },
            { icon: Calendar, title: tr("home.how.s2.title"), desc: tr("home.how.s2.desc") },
            { icon: CreditCard, title: tr("home.how.s3.title"), desc: tr("home.how.s3.desc") },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* SERVICIOS DESTACADOS */}
      {featured.length > 0 && (
        <section className="container py-16">
          <div className="flex flex-wrap items-end justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{tr("home.featured.title")}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">{tr("home.featured.subtitle")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/servicios">{tr("home.featured.all")}</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((s) => (
              <Card key={s.id} className="overflow-hidden group">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={{
                    backgroundImage: s.imageUrl
                      ? `url('${s.imageUrl}')`
                      : "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.25))",
                  }}
                />
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {formatMoney(s.priceCents)}
                    </span>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/servicios/${s.slug}`}>Ver más →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORÍAS */}
      {categories.length > 0 && (
        <section className="bg-muted/40 py-16">
          <div className="container">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">{tr("home.categories.title")}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">{tr("home.categories.subtitle")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {categories.map((c: Category) => (
                <Link
                  key={c.id}
                  href={`/servicios?cat=${c.slug}`}
                  className="spa-card hover:shadow-md transition-shadow text-center"
                >
                  <h3 className="font-semibold mb-1">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c._count?.services ?? 0} {tr("home.categories.count")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PAQUETES Y MEMBRESÍAS */}
      {(topPackages.length > 0 || topTiers.length > 0) && (
        <section className="container py-16">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">{tr("home.save.title")}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {tr("home.save.subtitle")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {topPackages.length > 0 && (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">{tr("home.save.packages")}</h3>
                  </div>
                  <ul className="space-y-3 mb-5">
                    {topPackages.map((p: any) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground"> · {p.sessions} {tr("home.save.sessions")}</span>
                        </span>
                        <span className="font-semibold text-primary">
                          {formatMoney(p.priceCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full">
                    <Link href="/paquetes">{tr("home.save.packages.cta")}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {topTiers.length > 0 && (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">{tr("home.save.memberships")}</h3>
                  </div>
                  <ul className="space-y-3 mb-5">
                    {topTiers.map((t: any) => (
                      <li key={t.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-primary" />
                          <span className="font-medium">{t.name}</span>
                          <span className="text-muted-foreground">
                            · {t.discountPercent}% {tr("home.save.discount")}
                          </span>
                        </span>
                        <span className="font-semibold text-primary">
                          {formatMoney(t.monthlyPriceCents)}{tr("home.save.month")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full">
                    <Link href="/membresias">{tr("home.save.memberships.cta")}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* SOBRE NOSOTROS */}
      {(config.aboutText || config.aboutImageUrl) && (
        <section className="container py-12 sm:py-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className={config.aboutImageUrl ? "" : "md:col-span-2 max-w-2xl mx-auto text-center"}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                {tr("home.about.badge")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                {config.aboutTitle ?? `Conoce ${config.spaName}`}
              </h2>
              {config.aboutText && (
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-3">
                  {config.aboutText.split("\n").slice(0, 3).map((p, i) =>
                    p.trim() ? <p key={i}>{p}</p> : null
                  )}
                </div>
              )}
              <Button asChild variant="link" className="mt-4 px-0">
                <Link href="/sobre">{tr("home.about.more")} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            {config.aboutImageUrl && (
              <div
                className="aspect-[4/5] rounded-2xl bg-cover bg-center shadow-xl order-first md:order-last"
                style={{ backgroundImage: `url('${config.aboutImageUrl}')` }}
              />
            )}
          </div>
        </section>
      )}

      {/* GALERÍA PREVIEW */}
      {galleryPreview.length > 0 && (
        <section className="container py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Nuestro trabajo</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Resultados que hablan por sí solos</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/galeria">Ver galería completa →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {galleryPreview.map((p) => (
              <div
                key={p.id}
                className="aspect-square bg-cover bg-center rounded-lg overflow-hidden"
                style={{ backgroundImage: `url('${p.url}')` }}
              />
            ))}
          </div>
        </section>
      )}

      {/* RESEÑAS */}
      {topReviews.length > 0 && (
        <section className="bg-muted/40 py-12 sm:py-16">
          <div className="container max-w-5xl">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Lo que dicen nuestros clientes</h2>
              {avgRating > 0 && (
                <div className="inline-flex items-center gap-2">
                  <Stars value={Math.round(avgRating)} size={18} />
                  <span className="font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({reviews.length} reseñas)</span>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
              {topReviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-5 sm:p-6">
                    <Stars value={r.rating} />
                    <p className="mt-3 text-sm sm:text-base text-foreground/90 leading-relaxed italic line-clamp-5">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                    <div className="mt-4 pt-3 border-t text-sm">
                      <span className="font-medium">{r.authorName}</span>
                      {r.serviceName && (
                        <span className="text-xs text-muted-foreground block mt-0.5">{r.serviceName}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link href="/resenas">Ver todas las reseñas →</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA WHATSAPP */}
      <section className="container py-16">
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6 sm:p-10 text-center">
            <MessageSquare className="h-10 sm:h-12 w-10 sm:w-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-3">¿Tienes preguntas?</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Escríbenos directamente por WhatsApp y te atenderemos al instante.
            </p>
            <Button asChild size="lg">
              <a
                href={`https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Hablar por WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
