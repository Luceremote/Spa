import { useEffect, useState } from "react";
import { ScrollView, View, Text, Image, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney, radius } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import { Badge } from "../../src/components/ui";
import type { Service } from "../../src/lib/types";

const { width } = Dimensions.get("window");

export default function ServiceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useTheme();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const primary = hsl(theme.colorPrimary);

  useEffect(() => {
    if (!slug) return;
    api<{ service: Service }>(`/services/${slug}`)
      .then((r) => setService(r.service))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: hsl(theme.colorBackground) }]}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: hsl(theme.colorBackground) }]}>
        <Text>Servicio no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      <Stack.Screen options={{ title: "", headerTransparent: true, headerTintColor: "#fff" }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Imagen grande */}
        <View style={{ height: width * 0.8, backgroundColor: hsl(theme.colorPrimary, 0.12) }}>
          {service.imageUrl ? (
            <Image source={{ uri: resolveImage(service.imageUrl) }} style={{ flex: 1 }} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <Ionicons name="flower-outline" size={64} color={primary} />
            </View>
          )}
        </View>

        {/* Contenido sobre tarjeta que sube */}
        <View
          style={[
            styles.sheet,
            { borderTopLeftRadius: radius(theme, 2), borderTopRightRadius: radius(theme, 2) },
          ]}
        >
          {service.category && <Badge label={service.category.name} />}
          <Text style={[styles.title, { color: hsl(theme.colorForeground) }]}>{service.name}</Text>

          {/* Chips de duración y precio */}
          <View style={styles.statsRow}>
            <View style={[styles.stat, { backgroundColor: hsl(theme.colorMuted, 0.5) }]}>
              <Ionicons name="time-outline" size={18} color={primary} />
              <View>
                <Text style={styles.statLabel}>Duración</Text>
                <Text style={styles.statValue}>{service.durationMinutes} min</Text>
              </View>
            </View>
            <View style={[styles.stat, { backgroundColor: hsl(theme.colorMuted, 0.5) }]}>
              <Ionicons name="pricetag-outline" size={18} color={primary} />
              <View>
                <Text style={styles.statLabel}>Precio</Text>
                <Text style={[styles.statValue, { color: primary }]}>{formatMoney(service.priceCents)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.descTitle}>Descripción</Text>
          <Text style={styles.desc}>{service.description}</Text>
        </View>
      </ScrollView>

      {/* Barra fija de reservar */}
      <View style={[styles.bottomBar, { backgroundColor: hsl(theme.colorBackground), borderTopColor: hsl(theme.colorMuted, 0.6) }]}>
        <View>
          <Text style={{ fontSize: 11, color: "#999" }}>Total</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: primary }}>
            {formatMoney(service.priceCents)}
          </Text>
        </View>
        <Button
          title="Reservar"
          size="lg"
          icon={<Ionicons name="calendar-outline" size={18} color="#fff" />}
          onPress={() => router.push(`/reservar?service=${service.id}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheet: { marginTop: -28, backgroundColor: "transparent", padding: 24, paddingTop: 28, gap: 4 },
  title: { fontSize: 26, fontWeight: "800", marginTop: 8, letterSpacing: -0.4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  statLabel: { fontSize: 11, color: "#888" },
  statValue: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  descTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 6 },
  desc: { fontSize: 15, lineHeight: 23, color: "#555" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
  },
});
