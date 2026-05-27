import { View, Text, ScrollView, Linking, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme, radius } from "../../src/lib/theme";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { InfoRow } from "../../src/components/ui";

const SOCIALS: { key: string; icon: keyof typeof Ionicons.glyphMap; field: string }[] = [
  { key: "ig", icon: "logo-instagram", field: "instagramUrl" },
  { key: "fb", icon: "logo-facebook", field: "facebookUrl" },
  { key: "tt", icon: "logo-tiktok", field: "tiktokUrl" },
  { key: "tw", icon: "logo-twitter", field: "twitterUrl" },
  { key: "yt", icon: "logo-youtube", field: "youtubeUrl" },
];

export default function Contacto() {
  const { theme, config } = useTheme();
  const primary = hsl(theme.colorPrimary);
  const waUrl = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`;
  const socials = SOCIALS.filter((s) => (config as any)[s.field]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hsl(theme.colorBackground) }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* WhatsApp destacado */}
      <Card style={{ alignItems: "center", paddingVertical: 28 }}>
        <View style={[styles.waIcon, { backgroundColor: "#25D366" }]}>
          <Ionicons name="logo-whatsapp" size={32} color="#fff" />
        </View>
        <Text style={[styles.h2, { color: hsl(theme.colorForeground), marginTop: 14 }]}>
          Escríbenos por WhatsApp
        </Text>
        <Text style={styles.sub}>La forma más rápida de contactarnos</Text>
        <View style={{ marginTop: 16, width: "100%" }}>
          <Button
            title="Abrir WhatsApp"
            fullWidth
            icon={<Ionicons name="logo-whatsapp" size={18} color="#fff" />}
            onPress={() => Linking.openURL(waUrl)}
          />
        </View>
      </Card>

      {/* Datos de contacto */}
      <Card style={{ gap: 16 }}>
        {config.address && (
          <InfoRow icon="location-outline" label="Dirección" value={config.address} />
        )}
        <Pressable onPress={() => Linking.openURL(`tel:+${config.whatsappPhone}`)}>
          <InfoRow icon="call-outline" label="Teléfono" value={`+${config.whatsappPhone}`} />
        </Pressable>
        {config.email && (
          <Pressable onPress={() => Linking.openURL(`mailto:${config.email}`)}>
            <InfoRow icon="mail-outline" label="Email" value={config.email} />
          </Pressable>
        )}
        {config.openingHours && (
          <InfoRow icon="time-outline" label="Horario" value={config.openingHours} />
        )}
      </Card>

      {/* Redes sociales */}
      {socials.length > 0 && (
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          <Text style={[styles.h2, { color: hsl(theme.colorForeground), marginBottom: 4 }]}>Síguenos</Text>
          <Text style={styles.sub}>Novedades y promociones</Text>
          <View style={styles.socialRow}>
            {socials.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => Linking.openURL((config as any)[s.field])}
                style={[styles.socialBtn, { backgroundColor: hsl(theme.colorPrimary, 0.1), borderRadius: radius(theme, 1.5) }]}
              >
                <Ionicons name={s.icon} size={24} color={primary} />
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  waIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  h2: { fontSize: 19, fontWeight: "800" },
  sub: { fontSize: 13.5, color: "#888", marginTop: 2, textAlign: "center" },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 16, flexWrap: "wrap", justifyContent: "center" },
  socialBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
});
