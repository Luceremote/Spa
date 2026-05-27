import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme } from "../lib/theme";

// Badge / chip pequeño
export function Badge({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "muted" | "accent";
}) {
  const { theme } = useTheme();
  const bg =
    tone === "primary"
      ? hsl(theme.colorPrimary, 0.12)
      : tone === "accent"
      ? hsl(theme.colorAccent, 0.25)
      : hsl(theme.colorMuted, 0.8);
  const color =
    tone === "primary" ? hsl(theme.colorPrimary) : hsl(theme.colorForeground, 0.8);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// Encabezado de sección con título + acción opcional
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: hsl(theme.colorForeground) }]}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

// Estado vacío amigable
export function EmptyState({
  icon = "sparkles-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: hsl(theme.colorMuted, 0.6) }]}>
        <Ionicons name={icon} size={28} color={hsl(theme.colorForeground, 0.4)} />
      </View>
      <Text style={[styles.emptyTitle, { color: hsl(theme.colorForeground) }]}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

// Fila de info con icono (para contacto, detalles)
export function InfoRow({
  icon,
  label,
  value,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.infoRow, style]}>
      <View style={[styles.infoIcon, { backgroundColor: hsl(theme.colorPrimary, 0.1) }]}>
        <Ionicons name={icon} size={18} color={hsl(theme.colorPrimary)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 12, color: "#888" },
  infoValue: { fontSize: 15, fontWeight: "600", marginTop: 1 },
});
