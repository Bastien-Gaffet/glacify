import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGlacifyStore } from "../store/useGlacifyStore";

export default function RootLayout() {
  const loadFromStorage = useGlacifyStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF6B9D",
        tabBarStyle: { backgroundColor: "#FFF8F0" },
        headerStyle: { backgroundColor: "#FFF8F0" },
        headerTintColor: "#FF6B9D",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="flavors/index"
        options={{
          title: "Parfums",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="color-palette" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people/index"
        options={{
          title: "Personnes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="order/index"
        options={{
          title: "Commande",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ice-cream" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
