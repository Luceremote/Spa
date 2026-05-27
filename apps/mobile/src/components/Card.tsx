import React from "react";
import { View, ViewProps } from "react-native";
import { hsl, useTheme, radius, shadow } from "../lib/theme";

interface Props extends ViewProps {
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, style, elevated = true, padded = true, ...rest }: Props) {
  const { theme } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: "#fff",
          borderRadius: radius(theme, 1.15),
          padding: padded ? 16 : 0,
          borderWidth: 1,
          borderColor: hsl(theme.colorMuted, 0.6),
        },
        elevated ? shadow.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
