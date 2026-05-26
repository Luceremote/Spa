import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { WhatsAppFab } from "../../src/components/WhatsAppFab";
import type { Service } from "../../src/lib/types";

export default function Home() {
  const { theme, config, refresh } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const featured = services.filter((s) => s.featured).slice(0, 3);
  const bgLight = hsl(theme.colorPrimary, 0.08);

  return (
    <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO */}
        <View style={[styles.hero, { backgroundColor: bgLight }]}>
          {config.heroImageUrl && (
            <Image
              source={{ uri: resolveImage(config.heroImageUrl) }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={config.heroImageUrl ? styles.heroOverlay : undefined}>
            <Text
              style={[
                styles.heroTitle,
                { color: config.heroImageUrl ? "#fff" : hsl(theme.colorForeground) },
              ]}
            >
              {config.spaName}
            </Text>
            <Text
              style={[
                styles.heroTagline,
                { color: config.heroImageUrl ? "rgba(255,255,255,0.9)" : "#666" },
              ]}
            >
              {config.tagline}
            </Text>
            <View style={{ marginTop: 16, width: "100%", maxWidth: 300 }}>
              <Button title="Reservar ahora" onPress={() => router.push("/reservar")} />
            </View>
          </View>
        </View>

        {/* Cómo funciona */}
        <View style={styles.section}>
          <Text style={[styles.h2, { color: hsl(theme.colorForeground) }]}>Cómo funciona</Text>
          <View style={styles.steps}>
            {[
              { i: "sparkles", t: "Elige tu servicio" },
              { i: "calendar", t: "Reserva fecha y hora" },
              { i: "card", t: "Paga seguro" },
            ].map((s, i) => (
              <Card key={i} style={styles.stepCard}>
                <View style={[styles.stepIcon, { backgroundColor: bgLight }]}>
                  <Ionicons name={s.i as any} size={20} color={hsl(theme.colorPrimary)} />
                </View>
                <Text style={styles.stepText}>{s.t}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Destacados */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.h2, { color: hsl(theme.colorForeground) }]}>Destacados</Text>
            {featured.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/servicio/${s.slug}`)}
                style={{ marginBottom: 12 }}
              >
                <Card style={{ flexDirection: "row", gap: 12, padding: 12 }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      backgroundColor: bgLight,
                      overflow: "hidden",
                    }}
                  >
                    {s.imageUrl && (
                      <Image source={{ uri: resolveImage(s.imageUrl) }} style={{ flex: 1 }} />
                    )}
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={{ fontWeight: "600", fontSize: 15 }}>{s.name}</Text>
                    <Text style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                      {s.durationMinutes} min
                    </Text>
                    <Text
                      style={{
                        color: hsl(theme.colorPrimary),
                        fontWeight: "700",
                        marginTop: 4,
                      }}
                    >
                      {formatMoney(s.priceCents)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <WhatsAppFab />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
  },
  heroTitle: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  heroTagline: { fontSize: 16, marginTop: 8, textAlign: "center" },
  section: { padding: 20 },
  h2: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  steps: { gap: 12 },
  stepCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontWeight: "600", fontSize: 15 },
});
