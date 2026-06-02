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

interface Pkg {
  id: string;
  name: string;
  sessions: number;
  priceCents: number;
  validityDays: number;
  service?: { name: string };
}

export default function PaquetesScreen() {
  const { theme } = useTheme();
  const primary = hsl(theme.colorPrimary);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ packages: Pkg[] }>("/packages").then((r) => setPackages(r.packages)).catch(() => {});
  }, []);

  async function buy() {
    if (!selected) return;
    if (!name || !phone || !email) {
      Alert.alert("Faltan datos", "Completa nombre, teléfono y email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ url: string }>("/packages/buy", {
        method: "POST",
        json: {
          packageId: selected.id,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
        },
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
      <Stack.Screen options={{ title: "Paquetes" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
        contentContainerStyle={{ padding: 16, gap: 14 }}
      >
        <Text style={styles.intro}>
          Compra varias sesiones por adelantado y ahorra. Reserva cuando quieras dentro de la validez.
        </Text>

        {packages.length === 0 ? (
          <Card>
            <Text style={{ color: "#888", textAlign: "center" }}>
              Pronto tendremos paquetes disponibles.
            </Text>
          </Card>
        ) : (
          packages.map((p) => (
            <Card key={p.id} style={{ gap: 6 }}>
              <Text style={styles.svc}>{p.service?.name}</Text>
              <Text style={styles.name}>{p.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={[styles.price, { color: primary }]}>{formatMoney(p.priceCents)}</Text>
                <Text style={styles.meta}>· {p.sessions} sesiones</Text>
              </View>
              <Text style={styles.meta}>
                {formatMoney(Math.round(p.priceCents / p.sessions))} por sesión · validez {p.validityDays} días
              </Text>
              {selected?.id === p.id ? (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TextInput placeholder="Tu nombre" value={name} onChangeText={setName} style={styles.input} />
                  <TextInput placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={styles.input} />
                  <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
                  <Button title="Pagar" onPress={buy} loading={submitting} fullWidth />
                  <Button title="Cancelar" variant="ghost" onPress={() => setSelected(null)} fullWidth />
                </View>
              ) : (
                <Button title="Comprar" onPress={() => setSelected(p)} fullWidth />
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { color: "#666", fontSize: 14, lineHeight: 20 },
  svc: { fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 },
  name: { fontSize: 18, fontWeight: "800" },
  price: { fontSize: 24, fontWeight: "800" },
  meta: { fontSize: 13, color: "#888" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
