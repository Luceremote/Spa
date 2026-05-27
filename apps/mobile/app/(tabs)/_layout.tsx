import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { hsl, useTheme } from "../../src/lib/theme";

export default function TabsLayout() {
  const { theme } = useTheme();
  const primary = hsl(theme.colorPrimary);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: "#9aa0a6",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: hsl(theme.colorMuted, 0.6),
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: {
          backgroundColor: hsl(theme.colorBackground),
          shadowColor: "transparent",
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: hsl(theme.colorMuted, 0.5),
        },
        headerTitleStyle: { fontWeight: "800", fontSize: 18, color: hsl(theme.colorForeground) },
        headerTintColor: hsl(theme.colorForeground),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="servicios"
        options={{
          title: "Servicios",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gift-cards"
        options={{
          title: "Gift Cards",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "gift" : "gift-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mis-reservas"
        options={{
          title: "Reservas",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacto"
        options={{
          title: "Contacto",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "call" : "call-outline"} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
