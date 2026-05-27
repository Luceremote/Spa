import { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney, radius, shadow } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import { EmptyState } from "../../src/components/ui";
import type { Service, Category } from "../../src/lib/types";

export default function ServiciosTab() {
  const { theme } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const primary = hsl(theme.colorPrimary);

  useEffect(() => {
    Promise.all([
      api<{ services: Service[] }>("/services"),
      api<{ categories: Category[] }>("/categories"),
    ])
      .then(([s, c]) => {
        setServices(s.services);
        setCategories(c.categories);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCat ? services.filter((s) => s.category?.slug === activeCat) : services;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: hsl(theme.colorBackground) }]}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      {/* Chips de categorías */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}
        >
          <Chip label="Todos" active={!activeCat} onPress={() => setActiveCat(null)} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={activeCat === c.slug}
              onPress={() => setActiveCat(c.slug)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="sparkles-outline" title="Sin servicios" subtitle="Pronto agregaremos más en esta categoría." />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/servicio/${item.slug}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
          >
            <View style={[styles.card, { borderRadius: radius(theme, 1.3), ...shadow.sm }]}>
              <View
                style={{
                  width: 110,
                  backgroundColor: hsl(theme.colorPrimary, 0.1),
                }}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: resolveImage(item.imageUrl) }} style={{ flex: 1 }} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.center]}>
                    <Ionicons name="flower-outline" size={28} color={primary} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, padding: 14, justifyContent: "center" }}>
                {item.category && (
                  <Text style={[styles.cat, { color: primary }]}>{item.category.name.toUpperCase()}</Text>
                )}
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#999" />
                    <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                  </View>
                  <Text style={[styles.price, { color: primary }]}>{formatMoney(item.priceCents)}</Text>
                </View>
              </View>
              <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? hsl(theme.colorPrimary) : "#fff",
        borderWidth: 1,
        borderColor: active ? hsl(theme.colorPrimary) : hsl(theme.colorMuted, 0.7),
      }}
    >
      <Text style={{ color: active ? "#fff" : "#555", fontWeight: "600", fontSize: 13.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    overflow: "hidden",
    minHeight: 110,
    alignItems: "stretch",
  },
  cat: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 3 },
  name: { fontWeight: "700", fontSize: 15.5, lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12.5, color: "#999" },
  price: { fontSize: 16, fontWeight: "800" },
  chevron: { justifyContent: "center", paddingRight: 10 },
});
