import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { hsl, useTheme } from "../../src/lib/theme";

export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: hsl(theme.colorPrimary),
        tabBarInactiveTintColor: "#999",
        headerStyle: { backgroundColor: hsl(theme.colorBackground) },
        headerTintColor: hsl(theme.colorForeground),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="servicios"
        options={{
          title: "Servicios",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mis-reservas"
        options={{
          title: "Mis reservas",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="contacto"
        options={{
          title: "Contacto",
          tabBarIcon: ({ color, size }) => <Ionicons name="call" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
