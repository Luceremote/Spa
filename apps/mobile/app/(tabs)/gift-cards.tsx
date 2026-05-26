import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, formatMoney } from "../../src/lib/theme";
import { api } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";

const DENOMS = [
  { cents: 5000, label: "$50" },
  { cents: 10000, label: "$100", popular: true },
  { cents: 15000, label: "$150" },
  { cents: 20000, label: "$200" },
];

export default function GiftCardsTab() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<"buy" | "check">("buy");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <View style={{ alignItems: "center", marginVertical: 16 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: hsl(theme.colorPrimary, 0.1),
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="gift" size={28} color={hsl(theme.colorPrimary)} />
        </View>
        <Text style={[styles.h1, { color: hsl(theme.colorForeground) }]}>Gift Cards</Text>
        <Text style={{ color: "#666", textAlign: "center", marginTop: 4 }}>
          Regala bienestar
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        <TabBtn label="Comprar" active={tab === "buy"} onPress={() => setTab("buy")} />
        <TabBtn label="Consultar saldo" active={tab === "check"} onPress={() => setTab("check")} />
      </View>

      {tab === "buy" ? <BuyForm /> : <CheckBalance />}
    </ScrollView>
  );
}

function TabBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: active ? hsl(theme.colorPrimary) : hsl(theme.colorMuted),
      }}
    >
      <Text style={{ color: active ? "#fff" : "#444", fontSize: 13, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function BuyForm() {
  const { theme } = useTheme();
  const [amount, setAmount] = useState(10000);
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const payload: any = {
        amountCents: amount,
        purchaserName,
        purchaserEmail,
        ...(message && { message }),
      };
      if (forSomeoneElse) {
        payload.recipientName = recipientName;
        payload.recipientEmail = recipientEmail;
      }
      const r = await api<{ url: string }>("/gift-cards/purchase", {
        method: "POST",
        json: payload,
      });
      if (Platform.OS === "web") {
        Linking.openURL(r.url);
      } else {
        await WebBrowser.openBrowserAsync(r.url);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Text style={styles.label}>Elige el valor</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {DENOMS.map((d) => (
          <Pressable
            key={d.cents}
            onPress={() => setAmount(d.cents)}
            style={{
              flexBasis: "47%",
              padding: 14,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: amount === d.cents ? hsl(theme.colorPrimary) : hsl(theme.colorMuted),
              alignItems: "center",
              backgroundColor: amount === d.cents ? hsl(theme.colorPrimary, 0.05) : "#fff",
            }}
          >
            {d.popular && (
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  backgroundColor: hsl(theme.colorPrimary),
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>POPULAR</Text>
              </View>
            )}
            <Text style={{ fontSize: 18, fontWeight: "700" }}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: hsl(theme.colorMuted) }}>
        <Text style={styles.label}>Tu nombre</Text>
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          value={purchaserName}
          onChangeText={setPurchaserName}
        />
        <Text style={styles.label}>Tu email</Text>
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          value={purchaserEmail}
          onChangeText={setPurchaserEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
        <Switch value={forSomeoneElse} onValueChange={setForSomeoneElse} />
        <Text style={{ marginLeft: 8 }}>Es un regalo para alguien más</Text>
      </View>

      {forSomeoneElse && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: hsl(theme.colorMuted),
            borderRadius: 10,
          }}
        >
          <Text style={styles.label}>Nombre del destinatario</Text>
          <TextInput
            style={[styles.input, { borderColor: "#fff" }]}
            value={recipientName}
            onChangeText={setRecipientName}
          />
          <Text style={styles.label}>Email del destinatario</Text>
          <TextInput
            style={[styles.input, { borderColor: "#fff" }]}
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Mensaje (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: "#fff", minHeight: 60 }]}
            value={message}
            onChangeText={setMessage}
            multiline
          />
        </View>
      )}

      <View
        style={{
          marginTop: 16,
          padding: 14,
          backgroundColor: hsl(theme.colorPrimary, 0.05),
          borderRadius: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text>Total</Text>
        <Text style={{ fontSize: 22, fontWeight: "700", color: hsl(theme.colorPrimary) }}>
          {formatMoney(amount)}
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Button
          title="Comprar gift card"
          loading={submitting}
          disabled={!purchaserName || !purchaserEmail || amount < 2000}
          onPress={submit}
        />
      </View>
    </Card>
  );
}

function CheckBalance() {
  const { theme } = useTheme();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ balanceCents: number; initialCents: number } | null>(null);
  const [err, setErr] = useState("");

  async function check() {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const r = await api<{ giftCard: { balanceCents: number; initialCents: number } }>(
        `/gift-cards/balance/${encodeURIComponent(code.trim())}`
      );
      setResult(r.giftCard);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Text style={styles.label}>Código</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: hsl(theme.colorMuted), fontFamily: "monospace", letterSpacing: 2 },
        ]}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX"
        autoCapitalize="characters"
      />
      <Button title="Consultar" loading={loading} disabled={!code} onPress={check} />
      {err && <Text style={{ color: "#dc2626", marginTop: 8, fontSize: 13 }}>{err}</Text>}
      {result && (
        <View
          style={{
            marginTop: 16,
            padding: 20,
            backgroundColor: hsl(theme.colorPrimary),
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, opacity: 0.8, letterSpacing: 2 }}>
            SALDO DISPONIBLE
          </Text>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700", marginVertical: 6 }}>
            {formatMoney(result.balanceCents)}
          </Text>
          <Text style={{ color: "#fff", opacity: 0.9, fontSize: 12 }}>
            Valor inicial: {formatMoney(result.initialCents)}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 4, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
});
