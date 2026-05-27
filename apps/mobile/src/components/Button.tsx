import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from "react-native";
import { hsl, useTheme, radius, shadow } from "../lib/theme";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  fullWidth,
}: Props) {
  const { theme } = useTheme();
  const r = radius(theme);
  const primary = hsl(theme.colorPrimary);

  const heights = { sm: 40, md: 52, lg: 58 };
  const fontSizes = { sm: 14, md: 16, lg: 17 };
  const padX = { sm: 16, md: 22, lg: 26 };

  let bg = "transparent";
  let border = "transparent";
  let color = "#fff";
  let useShadow = false;

  if (variant === "primary") {
    bg = primary;
    color = "#fff";
    useShadow = true;
  } else if (variant === "outline") {
    border = primary;
    color = primary;
  } else if (variant === "soft") {
    bg = hsl(theme.colorPrimary, 0.12);
    color = primary;
  } else {
    color = primary;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          height: heights[size],
          paddingHorizontal: padX[size],
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderRadius: r,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        useShadow && !disabled ? { ...shadow.sm, shadowColor: primary, shadowOpacity: 0.35 } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, { color, fontSize: fontSizes[size] }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontWeight: "700", letterSpacing: 0.2 },
});
