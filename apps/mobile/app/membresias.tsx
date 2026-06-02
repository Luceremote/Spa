import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney } from "../src/lib/theme";
import { api } from "../src/lib/api";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  discountPercent: number;
  perks: string | null;
  color: string | null;
}

export default function MembresiasScreen() {
  const { theme } = useTheme();
  const primary = hsl(theme.colorPrimary);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selected, setSelected] = useState<Tier | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ tiers: Tier[] }>("/memberships/tiers").then((r) => setTiers(r.tiers)).catch(() => {});
  }, []);

  async function subscribe() {
    if (!selected) return;
    if (!name || !phone || !email) {
      Alert.alert("Faltan datos", "Completa nombre, teléfono y email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ url: string }>("/memberships/subscribe", {
        method: "POST",
        json: { tierId: selected.id, customer: { name, phone, email } },
      });
      if (Platform.OS === "web") Linking.openURL(r.url);
      else await WebBrowser.openBrowserAsync(r.url);
      setSelected(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Membresías" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
        contentContainerStyle={{ padding: 16, gap: 14 }}
      >
        <Text style={styles.intro}>
          Únete al club y obtén descuentos permanentes en cada reserva. Cobro mensual, cancela cuando quieras.
        </Text>

        {tiers.length === 0 ? (
          <Card>
            <Text style={{ color: "#888", textAlign: "center" }}>Pronto presentaremos nuestros planes.</Text>
          </Card>
        ) : (
          tiers.map((t) => {
            const color = t.color || hsl(theme.colorPrimary);
            const perks = (t.perks ?? "").split("\n").filter(Boolean);
            return (
              <Card key={t.id} style={{ gap: 6, borderTopWidth: 4, borderTopColor: color }}>
                <View style={styles.row}>
                  <Ionicons name="ribbon" size={18} color={color} />
                  <Text style={styles.name}>{t.name}</Text>
                </View>
                {t.description ? <Text style={styles.meta}>{t.description}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text style={[styles.price, { color: primary }]}>{formatMoney(t.monthlyPriceCents)}</Text>
                  <Text style={styles.meta}>/mes</Text>
                </View>
                <Text style={[styles.discount, { color }]}>{t.discountPercent}% de descuento por reserva</Text>
                {perks.map((p, i) => (
                  <View key={i} style={styles.perk}>
                    <Ionicons name="checkmark-circle" size={15} color={color} />
                    <Text style={styles.perkText}>{p}</Text>
                  </View>
                ))}
                {selected?.id === t.id ? (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <TextInput placeholder="Tu nombre" value={name} onChangeText={setName} style={styles.input} />
                    <TextInput placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={styles.input} />
                    <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
                    <Button title="Continuar al pago" onPress={subscribe} loading={submitting} fullWidth />
                    <Button title="Cancelar" variant="ghost" onPress={() => setSelected(null)} fullWidth />
                  </View>
                ) : (
                  <Button title={`Suscribirme a ${t.name}`} onPress={() => setSelected(t)} fullWidth />
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { color: "#666", fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "800" },
  price: { fontSize: 24, fontWeight: "800" },
  discount: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 13, color: "#888" },
  perk: { flexDirection: "row", alignItems: "center", gap: 6 },
  perkText: { fontSize: 13, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
