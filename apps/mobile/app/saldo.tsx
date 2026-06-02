import { useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney } from "../src/lib/theme";
import { api } from "../src/lib/api";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";

export default function SaldoScreen() {
  const { theme } = useTheme();
  const primary = hsl(theme.colorPrimary);

  const [code, setCode] = useState("");
  const [gc, setGc] = useState<{ balanceCents: number; initialCents: number; code: string } | null>(null);
  const [gcLoading, setGcLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [pts, setPts] = useState<{ found: boolean; balance: number; customerName?: string } | null>(null);
  const [ptLoading, setPtLoading] = useState(false);

  async function checkGc() {
    if (!code.trim()) return;
    setGcLoading(true);
    setGc(null);
    try {
      const r = await api<{ giftCard: any }>(`/gift-cards/balance/${encodeURIComponent(code.trim())}`);
      setGc(r.giftCard);
    } catch {
      setGc(null);
    } finally {
      setGcLoading(false);
    }
  }

  async function checkPts() {
    if (!phone.trim()) return;
    setPtLoading(true);
    setPts(null);
    try {
      const r = await api<any>(`/marketing/loyalty/balance?phone=${encodeURIComponent(phone.trim())}`);
      setPts(r);
    } catch {
      setPts(null);
    } finally {
      setPtLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Consultar saldo" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Card style={{ gap: 12 }}>
          <View style={styles.row}>
            <Ionicons name="gift" size={20} color={primary} />
            <Text style={styles.cardTitle}>Gift card</Text>
          </View>
          <TextInput
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            style={styles.input}
          />
          <Button title="Consultar" onPress={checkGc} loading={gcLoading} fullWidth />
          {gc && (
            <View style={[styles.result, { backgroundColor: hsl(theme.colorPrimary, 0.08) }]}>
              <Text style={styles.resultLabel}>Saldo disponible</Text>
              <Text style={[styles.resultValue, { color: primary }]}>{formatMoney(gc.balanceCents)}</Text>
              <Text style={styles.resultSub}>de {formatMoney(gc.initialCents)} · {gc.code}</Text>
            </View>
          )}
        </Card>

        <Card style={{ gap: 12 }}>
          <View style={styles.row}>
            <Ionicons name="ribbon" size={20} color={primary} />
            <Text style={styles.cardTitle}>Puntos de lealtad</Text>
          </View>
          <TextInput
            placeholder="Tu teléfono"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />
          <Button title="Consultar" onPress={checkPts} loading={ptLoading} fullWidth />
          {pts && (
            <View style={[styles.result, { backgroundColor: hsl(theme.colorPrimary, 0.08) }]}>
              {pts.found ? (
                <>
                  {pts.customerName ? <Text style={styles.resultSub}>Hola, {pts.customerName}</Text> : null}
                  <Text style={[styles.resultValue, { color: primary }]}>{pts.balance} pts</Text>
                </>
              ) : (
                <Text style={styles.resultSub}>Aún no tienes puntos con ese teléfono.</Text>
              )}
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  result: { borderRadius: 12, padding: 16, alignItems: "center" },
  resultLabel: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  resultValue: { fontSize: 30, fontWeight: "800", marginTop: 2 },
  resultSub: { fontSize: 13, color: "#888", marginTop: 2 },
});
