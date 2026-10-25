import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useGlacifyStore } from "../store/useGlacifyStore";

export default function HomeScreen() {
  const router = useRouter();
  const flavors = useGlacifyStore((s) => s.flavors);
  const people = useGlacifyStore((s) => s.people);
  const availableToday = flavors.filter((f) => f.availableToday);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <View style={{ padding: 24 }}>

        {/* Header */}
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#FF6B9D" }}>
          🍦 Glacify
        </Text>
        <Text style={{ color: "#999", marginBottom: 24 }}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long"
          })}
        </Text>

        {/* Dispo du jour */}
        <View style={{
          backgroundColor: "#fff", borderRadius: 16,
          padding: 16, marginBottom: 16,
          shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3
        }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12 }}>
            Disponibles aujourd'hui
          </Text>
          {availableToday.length === 0 ? (
            <Text style={{ color: "#999" }}>Aucun parfum sélectionné</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {availableToday.map((f) => (
                <View key={f.id} style={{
                  backgroundColor: f.color + "33",
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 999
                }}>
                  <Text>{f.emoji} {f.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats rapides */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <View style={{
            flex: 1, backgroundColor: "#fff", borderRadius: 16,
            padding: 16, alignItems: "center",
            shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3
          }}>
            <Text style={{ fontSize: 28 }}>🎨</Text>
            <Text style={{ fontWeight: "bold", fontSize: 20 }}>{flavors.length}</Text>
            <Text style={{ color: "#999", fontSize: 12 }}>Parfums</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "#fff", borderRadius: 16,
            padding: 16, alignItems: "center",
            shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3
          }}>
            <Text style={{ fontSize: 28 }}>👥</Text>
            <Text style={{ fontWeight: "bold", fontSize: 20 }}>{people.length}</Text>
            <Text style={{ color: "#999", fontSize: 12 }}>Personnes</Text>
          </View>
        </View>

        {/* Bouton commande */}
        <TouchableOpacity
          onPress={() => router.push("/order")}
          style={{
            backgroundColor: "#FF6B9D", borderRadius: 16,
            padding: 20, alignItems: "center",
            shadowColor: "#FF6B9D", shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
            🍦 Nouvelle commande
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
