import { View, Text, ScrollView, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme } from "../../src/lib/theme";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";

export default function Contacto() {
  const { theme, config } = useTheme();
  const waUrl = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
      contentContainerStyle={{ padding: 20, gap: 14 }}
    >
      <Text style={[styles.h1, { color: hsl(theme.colorForeground) }]}>Contáctanos</Text>

      {config.address && (
        <InfoCard
          icon="location"
          label="Dirección"
          value={config.address}
          color={hsl(theme.colorPrimary)}
        />
      )}
      <InfoCard
        icon="call"
        label="Teléfono / WhatsApp"
        value={`+${config.whatsappPhone}`}
        color={hsl(theme.colorPrimary)}
        onPress={() => Linking.openURL(`tel:+${config.whatsappPhone}`)}
      />
      {config.email && (
        <InfoCard
          icon="mail"
          label="Email"
          value={config.email}
          color={hsl(theme.colorPrimary)}
          onPress={() => Linking.openURL(`mailto:${config.email}`)}
        />
      )}
      {config.openingHours && (
        <InfoCard
          icon="time"
          label="Horario"
          value={config.openingHours}
          color={hsl(theme.colorPrimary)}
        />
      )}

      <Card style={{ alignItems: "center", padding: 24, marginTop: 8 }}>
        <Ionicons name="logo-whatsapp" size={48} color="#25D366" />
        <Text style={[styles.h2, { color: hsl(theme.colorForeground), marginTop: 8 }]}>
          Chat directo
        </Text>
        <Text style={{ color: "#666", textAlign: "center", marginVertical: 12 }}>
          La forma más rápida de comunicarte con nosotros.
        </Text>
        <Button title="Abrir WhatsApp" onPress={() => Linking.openURL(waUrl)} />
      </Card>
    </ScrollView>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const Inner = (
    <Card style={{ flexDirection: "row", gap: 14, padding: 14 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: color + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, color: "#888" }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "500", marginTop: 2 }}>{value}</Text>
      </View>
    </Card>
  );
  if (onPress) {
    return (
      <View onTouchEnd={onPress}>
        {Inner}
      </View>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  h2: { fontSize: 20, fontWeight: "700" },
});
