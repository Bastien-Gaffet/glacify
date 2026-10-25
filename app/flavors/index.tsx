import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGlacifyStore } from "../../store/useGlacifyStore";

const PRESET_COLORS = [
  "#FFF3B0", "#8B4513", "#FF6B9D", "#90C97A", "#FFE135",
  "#AED6F1", "#F1948A", "#A569BD", "#F0E68C", "#98FB98",
];

const PRESET_EMOJIS = ["🍦", "🍫", "🍓", "🌿", "🍋", "🫐", "🍑", "🍪", "🥭", "🍵"];

export default function FlavorsScreen() {
  const { flavors, addFlavor, removeFlavor, toggleAvailableToday } = useGlacifyStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newEmoji, setNewEmoji] = useState(PRESET_EMOJIS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addFlavor(newName.trim(), newColor, newEmoji);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setNewEmoji(PRESET_EMOJIS[0]);
    setModalVisible(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Supprimer", `Supprimer le parfum "${name}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => removeFlavor(id) },
    ]);
  };

  const available = flavors.filter((f) => f.availableToday);
  const unavailable = flavors.filter((f) => !f.availableToday);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 4 }}>
          Mes parfums
        </Text>
        <Text style={{ color: "#999", marginBottom: 20 }}>
          {available.length} disponible{available.length > 1 ? "s" : ""} aujourd'hui
        </Text>

        <Text style={{ fontWeight: "700", color: "#FF6B9D", marginBottom: 10, fontSize: 13, letterSpacing: 1 }}>
          DISPONIBLES AUJOURD'HUI
        </Text>
        {available.length === 0 && (
          <Text style={{ color: "#ccc", marginBottom: 16, fontStyle: "italic" }}>
            Aucun parfum activé
          </Text>
        )}
        {available.map((f) => (
          <FlavorRow
            key={f.id}
            flavor={f}
            onToggle={() => toggleAvailableToday(f.id)}
            onDelete={() => handleDelete(f.id, f.name)}
          />
        ))}

        <Text style={{ fontWeight: "700", color: "#bbb", marginBottom: 10, marginTop: 20, fontSize: 13, letterSpacing: 1 }}>
          NON DISPONIBLES
        </Text>
        {unavailable.map((f) => (
          <FlavorRow
            key={f.id}
            flavor={f}
            onToggle={() => toggleAvailableToday(f.id)}
            onDelete={() => handleDelete(f.id, f.name)}
          />
        ))}

      </ScrollView>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          position: "absolute", bottom: 30, right: 24,
          backgroundColor: "#FF6B9D", width: 58, height: 58,
          borderRadius: 29, alignItems: "center", justifyContent: "center",
          shadowColor: "#FF6B9D", shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{
          flex: 1, justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.3)"
        }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 28,
            borderTopRightRadius: 28, padding: 24
          }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}>
              Nouveau parfum
            </Text>

            <TextInput
              placeholder="Nom du parfum (ex: Caramel)"
              value={newName}
              onChangeText={setNewName}
              style={{
                borderWidth: 1.5, borderColor: "#eee", borderRadius: 12,
                padding: 14, fontSize: 16, marginBottom: 16
              }}
            />

            <Text style={{ fontWeight: "600", marginBottom: 8, color: "#666" }}>Icône</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {PRESET_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: newEmoji === e ? "#FF6B9D22" : "#f5f5f5",
                    borderWidth: newEmoji === e ? 2 : 0,
                    borderColor: "#FF6B9D",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: "600", marginBottom: 8, color: "#666" }}>Couleur</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: c,
                    borderWidth: newColor === c ? 3 : 1.5,
                    borderColor: newColor === c ? "#FF6B9D" : "#ddd",
                  }}
                />
              ))}
            </View>

            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: newColor + "44", borderRadius: 12,
              padding: 12, marginBottom: 20
            }}>
              <Text style={{ fontSize: 24 }}>{newEmoji}</Text>
              <Text style={{ fontWeight: "600", fontSize: 16 }}>
                {newName || "Nom du parfum"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1, padding: 16, borderRadius: 12,
                  backgroundColor: "#f5f5f5", alignItems: "center"
                }}
              >
                <Text style={{ color: "#666", fontWeight: "600" }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                style={{
                  flex: 1, padding: 16, borderRadius: 12,
                  backgroundColor: "#FF6B9D", alignItems: "center"
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FlavorRow({ flavor, onToggle, onDelete }: any) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "#fff", borderRadius: 16,
      padding: 14, marginBottom: 10,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: flavor.color + "55",
        alignItems: "center", justifyContent: "center", marginRight: 14
      }}>
        <Text style={{ fontSize: 22 }}>{flavor.emoji}</Text>
      </View>

      <Text style={{ flex: 1, fontWeight: "600", fontSize: 16 }}>{flavor.name}</Text>

      <TouchableOpacity
        onPress={onToggle}
        style={{
          backgroundColor: flavor.availableToday ? "#FF6B9D" : "#eee",
          borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8
        }}
      >
        <Text style={{
          color: flavor.availableToday ? "#fff" : "#999",
          fontSize: 12, fontWeight: "600"
        }}>
          {flavor.availableToday ? "Dispo ✓" : "Inactif"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDelete}>
        <Ionicons name="trash-outline" size={20} color="#ddd" />
      </TouchableOpacity>
    </View>
  );
}
