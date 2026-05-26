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
import { hsl, useTheme, formatMoney } from "../../src/lib/theme";
import { api, resolveImage } from "../../src/lib/api";
import type { Service, Category } from "../../src/lib/types";

export default function ServiciosTab() {
  const { theme } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <ActivityIndicator color={hsl(theme.colorPrimary)} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
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

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/servicio/${item.slug}`)}
            style={[styles.card, { borderColor: hsl(theme.colorMuted) }]}
          >
            <View style={{ width: 90, height: 90, borderRadius: 8, overflow: "hidden", backgroundColor: hsl(theme.colorPrimary, 0.1) }}>
              {item.imageUrl && (
                <Image source={{ uri: resolveImage(item.imageUrl) }} style={{ flex: 1 }} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
              {item.category && (
                <Text style={{ fontSize: 11, color: hsl(theme.colorPrimary), textTransform: "uppercase" }}>
                  {item.category.name}
                </Text>
              )}
              <Text style={{ fontWeight: "600", fontSize: 15, marginTop: 2 }}>{item.name}</Text>
              <Text style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                {item.durationMinutes} min · {formatMoney(item.priceCents)}
              </Text>
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active ? hsl(theme.colorPrimary) : hsl(theme.colorMuted),
      }}
    >
      <Text style={{ color: active ? "#fff" : "#444", fontWeight: "500", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
});
