import React from "react";
import { View, ViewProps } from "react-native";
import { hsl, useTheme } from "../lib/theme";

export function Card({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  const radius = Number(String(theme.borderRadius).replace(/[^0-9.]/g, "")) || 12;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: "#fff",
          borderRadius: radius,
          padding: 16,
          borderWidth: 1,
          borderColor: hsl(theme.colorMuted),
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
