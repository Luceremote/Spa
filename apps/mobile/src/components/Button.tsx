import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from "react-native";
import { hsl, useTheme } from "../lib/theme";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = "primary", loading, disabled, icon }: Props) {
  const { theme } = useTheme();
  const radius = Number(String(theme.borderRadius).replace(/[^0-9.]/g, "")) || 12;
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const bg = isPrimary ? hsl(theme.colorPrimary) : "transparent";
  const borderColor = isOutline ? hsl(theme.colorPrimary) : "transparent";
  const color = isPrimary ? "#fff" : hsl(theme.colorPrimary);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: isOutline ? 1.5 : 0,
          borderRadius: radius,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontSize: 16, fontWeight: "600" },
});
