import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hsl, useTheme, formatMoney } from "../../src/lib/theme";
import { api } from "../../src/lib/api";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { registerForPush, unregisterPush, getStoredPush } from "../../src/lib/push";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const PHONE_KEY = "spa_lookup_phone";

interface Booking {
  id: string;
  startAt: string;
  status: string;
  priceCents: number;
  service?: { name: string; durationMinutes: number };
  staff?: { name: string } | null;
  payment?: { status: string } | null;
}

export default function MisReservas() {
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(PHONE_KEY);
      if (saved) {
        setPhone(saved);
        search(saved);
      }
      const stored = await getStoredPush();
      setPushEnabled(!!stored.token);
    })();
  }, []);

  async function search(p?: string) {
    const usedPhone = p ?? phone;
    if (!usedPhone) return;
    setLoading(true);
    try {
      const r = await api<{ bookings: Booking[] }>(
        `/bookings/lookup?phone=${encodeURIComponent(usedPhone)}`
      );
      setBookings(r.bookings);
      await AsyncStorage.setItem(PHONE_KEY, usedPhone);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function togglePush(v: boolean) {
    if (!phone) {
      Alert.alert("Primero busca tus reservas", "Ingresa tu teléfono para asociar las notificaciones.");
      return;
    }
    setTogglingPush(true);
    try {
      if (v) {
        const token = await registerForPush(phone);
        if (!token) {
          Alert.alert("Permiso requerido", "Habilita las notificaciones desde los ajustes del sistema.");
          setPushEnabled(false);
        } else {
          setPushEnabled(true);
          Alert.alert("Listo", "Te avisaremos antes de tus citas.");
        }
      } else {
        await unregisterPush();
        setPushEnabled(false);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setTogglingPush(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Card>
        <Text style={styles.label}>Tu teléfono</Text>
        <TextInput
          style={[styles.input, { borderColor: hsl(theme.colorMuted) }]}
          placeholder="+1 555 123 4567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          title={loading ? "Buscando..." : "Buscar mis reservas"}
          loading={loading}
          disabled={!phone}
          onPress={() => search()}
        />
      </Card>

      {phone && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>Recordatorios</Text>
              <Text style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                Te avisamos antes de tu cita
              </Text>
            </View>
            <Switch value={pushEnabled} onValueChange={togglePush} disabled={togglingPush} />
          </View>
        </Card>
      )}

      {loading && bookings === null && (
        <ActivityIndicator color={hsl(theme.colorPrimary)} style={{ marginTop: 24 }} />
      )}

      {bookings && bookings.length === 0 && (
        <Card style={{ alignItems: "center", padding: 24 }}>
          <Ionicons name="calendar-outline" size={36} color="#bbb" />
          <Text style={{ marginTop: 8, color: "#666" }}>No encontramos reservas.</Text>
        </Card>
      )}

      {bookings?.map((b) => (
        <Card key={b.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontWeight: "600", flex: 1 }}>{b.service?.name}</Text>
            <Text style={[styles.badge, { backgroundColor: hsl(theme.colorMuted) }]}>
              {STATUS_LABEL[b.status] ?? b.status}
            </Text>
          </View>
          {b.staff && (
            <Text style={{ color: "#666", fontSize: 12 }}>con {b.staff.name}</Text>
          )}
          <Text style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
            {new Date(b.startAt).toLocaleString("es-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: hsl(theme.colorMuted),
            }}
          >
            <Text style={{ color: b.payment?.status === "PAID" ? "#16a34a" : "#666", fontSize: 13 }}>
              {b.payment?.status === "PAID" ? "✓ Pagado" : "Por pagar"}
            </Text>
            <Text style={{ fontWeight: "700", color: hsl(theme.colorPrimary) }}>
              {formatMoney(b.priceCents)}
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    overflow: "hidden",
  },
});
