import React from "react";
import { Pressable, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

export function WhatsAppFab() {
  const { config } = useTheme();
  const url = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(config.whatsappMsg)}`;
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
      accessibilityLabel="Contactar por WhatsApp"
    >
      <Ionicons name="logo-whatsapp" size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
