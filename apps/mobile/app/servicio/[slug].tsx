import { useEffect, useState } from "react";
import { ScrollView, View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { hsl, useTheme, formatMoney } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import type { Service } from "../../src/lib/types";

export default function ServiceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useTheme();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

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
        <ActivityIndicator color={hsl(theme.colorPrimary)} size="large" />
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
    <ScrollView style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      <Stack.Screen options={{ title: service.name }} />
      <View
        style={{
          height: 240,
          backgroundColor: hsl(theme.colorPrimary, 0.1),
        }}
      >
        {service.imageUrl && (
          <Image source={{ uri: resolveImage(service.imageUrl) }} style={{ flex: 1 }} />
        )}
      </View>

      <View style={{ padding: 20 }}>
        {service.category && (
          <Text style={{ color: hsl(theme.colorPrimary), fontSize: 12, textTransform: "uppercase", fontWeight: "600" }}>
            {service.category.name}
          </Text>
        )}
        <Text style={[styles.title, { color: hsl(theme.colorForeground) }]}>{service.name}</Text>
        <Text style={[styles.desc, { color: "#555" }]}>{service.description}</Text>

        <View style={[styles.box, { backgroundColor: hsl(theme.colorMuted) }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Duración</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 4 }}>
              {service.durationMinutes} min
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: "#ddd" }} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Precio</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: hsl(theme.colorPrimary), marginTop: 4 }}>
              {formatMoney(service.priceCents)}
            </Text>
          </View>
        </View>

        <Button
          title="Reservar este servicio"
          onPress={() => router.push(`/reservar?service=${service.id}`)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "700", marginTop: 6 },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  box: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
  },
});
