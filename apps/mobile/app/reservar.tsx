import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { hsl, useTheme, formatMoney } from "../src/lib/theme";
import { api } from "../src/lib/api";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import type { Service } from "../src/lib/types";

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const m = 9 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Reservar() {
  const params = useLocalSearchParams<{ service?: string }>();
  const { theme, config } = useTheme();

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>(params.service ?? "");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [gcCode, setGcCode] = useState("");

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  useEffect(() => {
    api<{ services: Service[] }>("/services")
      .then((r) => setServices(r.services))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api<{ bookings: { startAt: string }[] }>(`/bookings/availability?date=${date}`)
      .then((r) => {
        setBusy(
          r.bookings.map((b) => {
            const d = new Date(b.startAt);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          })
        );
      })
      .catch(() => setBusy([]));
  }, [date]);

  async function submit() {
    if (!service || !time || !name || !phone) return;
    setSubmitting(true);
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
      const r = await api<{ booking: { id: string } }>("/bookings", {
        method: "POST",
        json: {
          customer: { name, phone, email: email || null },
          serviceId: service.id,
          startAt,
          giftCardCode: gcCode || null,
        },
      });
      setCreatedId(r.booking.id);
    } catch (e: any) {
      Alert.alert("No se pudo reservar", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function pay() {
    if (!createdId) return;
    setSubmitting(true);
    try {
      const r = await api<{ url: string }>("/payments/checkout", {
        method: "POST",
        json: { bookingId: createdId },
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

  // Pantalla de confirmación
  if (createdId) {
    return (
      <View style={{ flex: 1, backgroundColor: hsl(theme.colorBackground), padding: 20 }}>
        <Card style={{ alignItems: "center", padding: 32, marginTop: 40 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#dcfce7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 32 }}>✓</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}>
            ¡Reserva creada!
          </Text>
          <Text style={{ color: "#666", textAlign: "center", marginTop: 8, marginBottom: 24 }}>
            {service?.name} — {date} {time}
          </Text>
          <View style={{ width: "100%", gap: 10 }}>
            <Button title="Pagar con tarjeta" loading={submitting} onPress={pay} />
            <Button title="Pagar en el spa" variant="outline" onPress={() => router.replace("/")} />
          </View>
        </Card>
      </View>
    );
  }

  // Próximos 14 días
  const dayOptions = Array.from({ length: 14 }, (_, i) => addDays(todayISO(), i));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Card>
        <Text style={styles.label}>Servicio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {services.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setServiceId(s.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: serviceId === s.id ? hsl(theme.colorPrimary) : hsl(theme.colorMuted),
                  },
                ]}
              >
                <Text style={{ color: serviceId === s.id ? "#fff" : "#333", fontSize: 13 }}>
                  {s.name} · {formatMoney(s.priceCents)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.label}>Fecha</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {dayOptions.map((d) => {
              const isActive = d === date;
              const dt = new Date(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    setDate(d);
                    setTime("");
                  }}
                  style={[
                    styles.dayChip,
                    { backgroundColor: isActive ? hsl(theme.colorPrimary) : "#fff", borderColor: hsl(theme.colorMuted) },
                  ]}
                >
                  <Text style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.85)" : "#666" }}>
                    {dt.toLocaleDateString("es", { weekday: "short" })}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: isActive ? "#fff" : "#333" }}>
                    {dt.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[styles.label, { marginTop: 16 }]}>Hora</Text>
        <View style={styles.timeGrid}>
          {SLOTS.map((slot) => {
            const occupied = busy.includes(slot);
            const active = time === slot;
            return (
              <Pressable
                key={slot}
                disabled={occupied}
                onPress={() => setTime(slot)}
                style={[
                  styles.timeSlot,
                  {
                    backgroundColor: active
                      ? hsl(theme.colorPrimary)
                      : occupied
                      ? hsl(theme.colorMuted)
                      : "#fff",
                    borderColor: hsl(theme.colorMuted),
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : occupied ? "#aaa" : "#333",
                    textDecorationLine: occupied ? "line-through" : "none",
                    fontSize: 13,
                  }}
                >
                  {slot}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Tus datos</Text>
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          placeholder="Nombre completo"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          placeholder="Teléfono"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          placeholder="Email (opcional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={[styles.label, { marginTop: 8 }]}>Gift Card (opcional)</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: hsl(theme.colorMuted), fontFamily: "monospace", letterSpacing: 1 },
          ]}
          placeholder="XXXX-XXXX-XXXX"
          value={gcCode}
          onChangeText={(t) => setGcCode(t.toUpperCase())}
          autoCapitalize="characters"
        />
      </Card>

      {service && time && (
        <Card style={{ backgroundColor: hsl(theme.colorPrimary, 0.05) }}>
          <Text style={{ fontWeight: "600" }}>{service.name}</Text>
          <Text style={{ color: "#666", marginTop: 4 }}>
            {date} a las {time}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "700", color: hsl(theme.colorPrimary) }}>
            Total: {formatMoney(service.priceCents)}
          </Text>
        </Card>
      )}

      <Button
        title="Confirmar reserva"
        loading={submitting}
        disabled={!serviceId || !time || !name || !phone}
        onPress={submit}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#444" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dayChip: {
    width: 60,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  timeSlot: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 10,
    backgroundColor: "#fff",
  },
});
