import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney, radius, shadow } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Badge, SectionHeader } from "../../src/components/ui";
import { WhatsAppFab } from "../../src/components/WhatsAppFab";
import type { Service } from "../../src/lib/types";

const { width } = Dimensions.get("window");

const STEPS = [
  { icon: "sparkles" as const, title: "Elige", desc: "Explora el menú de tratamientos" },
  { icon: "calendar" as const, title: "Reserva", desc: "Día y hora a tu medida" },
  { icon: "card" as const, title: "Paga seguro", desc: "Con tarjeta o gift card" },
];

export default function Home() {
  const { theme, config, refresh } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const primary = hsl(theme.colorPrimary);

  async function load() {
    try {
      const r = await api<{ services: Service[] }>("/services");
      setServices(r.services);
    } catch {}
  }
  useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  }

  const featured = services.filter((s) => s.featured).slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
      >
        {/* HERO */}
        <View style={styles.hero}>
          {config.heroImageUrl ? (
            <Image source={{ uri: resolveImage(config.heroImageUrl) }} style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: primary },
              ]}
            />
          )}
          {/* Overlay degradado simulado con capa semitransparente */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.38)" }]} />

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color="#fff" />
              <Text style={styles.heroBadgeText}>Bienvenido</Text>
            </View>
            <Text style={styles.heroTitle}>{config.spaName}</Text>
            <Text style={styles.heroTagline}>{config.tagline}</Text>
            <View style={{ marginTop: 20, width: "100%" }}>
              <Button
                title="Reservar ahora"
                fullWidth
                size="lg"
                icon={<Ionicons name="calendar-outline" size={18} color="#fff" />}
                onPress={() => router.push("/reservar")}
              />
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 28 }}>
          {/* CÓMO FUNCIONA */}
          <View>
            <SectionHeader title="Cómo funciona" subtitle="Tu momento de bienestar en 3 pasos" />
            <View style={{ gap: 12 }}>
              {STEPS.map((s, i) => (
                <Card key={i} style={styles.stepCard}>
                  <View style={[styles.stepIcon, { backgroundColor: hsl(theme.colorPrimary, 0.12) }]}>
                    <Ionicons name={s.icon} size={22} color={primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>
                      {i + 1}. {s.title}
                    </Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>

          {/* DESTACADOS */}
          {featured.length > 0 && (
            <View>
              <SectionHeader
                title="Destacados"
                subtitle="Lo más reservado"
                action={
                  <Pressable onPress={() => router.push("/servicios")} hitSlop={10}>
                    <Text style={[styles.link, { color: primary }]}>Ver todo</Text>
                  </Pressable>
                }
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingRight: 4 }}
              >
                {featured.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push(`/servicio/${s.slug}`)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <View style={[styles.featCard, { borderRadius: radius(theme, 1.3), ...shadow.sm }]}>
                      <View
                        style={{
                          height: 130,
                          backgroundColor: hsl(theme.colorPrimary, 0.12),
                        }}
                      >
                        {s.imageUrl && (
                          <Image source={{ uri: resolveImage(s.imageUrl) }} style={{ flex: 1 }} />
                        )}
                        <View style={styles.featPriceTag}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                            {formatMoney(s.priceCents)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ padding: 12 }}>
                        {s.category && <Badge label={s.category.name} />}
                        <Text style={styles.featName} numberOfLines={2}>
                          {s.name}
                        </Text>
                        <View style={styles.featMeta}>
                          <Ionicons name="time-outline" size={13} color="#999" />
                          <Text style={styles.featMetaText}>{s.durationMinutes} min</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* CTA GIFT CARD */}
          <Pressable onPress={() => router.push("/gift-cards" as any)}>
            <View style={[styles.giftCta, { backgroundColor: hsl(theme.colorPrimary, 0.1), borderRadius: radius(theme, 1.3) }]}>
              <View style={[styles.giftIcon, { backgroundColor: primary }]}>
                <Ionicons name="gift" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.giftTitle, { color: hsl(theme.colorForeground) }]}>
                  Regala bienestar
                </Text>
                <Text style={styles.giftDesc}>Gift cards desde $50</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={primary} />
            </View>
          </Pressable>

          {/* ACCESOS: paquetes, membresías, saldo */}
          <View>
            <SectionHeader title="Más para ti" subtitle="Ahorra y acumula" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {[
                { icon: "pricetags" as const, title: "Paquetes", desc: "Sesiones con descuento", route: "/paquetes" },
                { icon: "ribbon" as const, title: "Membresías", desc: "Descuentos de socio", route: "/membresias" },
                { icon: "wallet" as const, title: "Mi saldo", desc: "Gift card y puntos", route: "/saldo" },
              ].map((item) => (
                <Pressable
                  key={item.route}
                  onPress={() => router.push(item.route as any)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, flexGrow: 1, flexBasis: "47%" }]}
                >
                  <View style={[styles.quickCard, { borderRadius: radius(theme, 1.2), ...shadow.sm }]}>
                    <View style={[styles.quickIcon, { backgroundColor: hsl(theme.colorPrimary, 0.12) }]}>
                      <Ionicons name={item.icon} size={20} color={primary} />
                    </View>
                    <Text style={styles.quickTitle}>{item.title}</Text>
                    <Text style={styles.quickDesc}>{item.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
      <WhatsAppFab />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: Math.max(340, width * 0.95),
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroContent: { padding: 24, paddingBottom: 36 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "#fff", fontSize: 36, fontWeight: "800", letterSpacing: -0.5 },
  heroTagline: { color: "rgba(255,255,255,0.92)", fontSize: 16, marginTop: 6, lineHeight: 22 },
  link: { fontSize: 14, fontWeight: "700" },
  stepCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 15, fontWeight: "700" },
  stepDesc: { fontSize: 13, color: "#888", marginTop: 2 },
  featCard: { width: 200, backgroundColor: "#fff", overflow: "hidden" },
  featPriceTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featName: { fontSize: 15, fontWeight: "700", marginTop: 6, lineHeight: 20 },
  featMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  featMetaText: { fontSize: 12, color: "#999" },
  giftCta: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  giftIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  giftTitle: { fontSize: 16, fontWeight: "700" },
  giftDesc: { fontSize: 13, color: "#888", marginTop: 1 },
  quickCard: { backgroundColor: "#fff", padding: 14, gap: 6 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quickTitle: { fontSize: 15, fontWeight: "700" },
  quickDesc: { fontSize: 12, color: "#888" },
});
