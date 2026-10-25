import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Flavor = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  availableToday: boolean;
};

export type Person = {
  id: string;
  name: string;
  isFavorite: boolean;
  totalScoops: number;
  flavorStats: Record<string, number>;
  sessionCount: number;
};

export type ScoopOrder = {
  flavorId: string;
  count: number;
};

export type PersonOrder = {
  personId: string;
  container: "cornet" | "coupe";
  scoops: ScoopOrder[];
};

export type Session = {
  id: string;
  date: string;
  orders: PersonOrder[];
};

type GlacifyState = {
  flavors: Flavor[];
  people: Person[];
  sessions: Session[];
  currentOrders: PersonOrder[];

  addFlavor: (name: string, color: string, emoji: string) => void;
  removeFlavor: (id: string) => void;
  toggleAvailableToday: (id: string) => void;

  addPerson: (name: string) => void;
  toggleFavorite: (id: string) => void;

  setCurrentOrders: (orders: PersonOrder[]) => void;
  saveSession: () => void;

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
};

const DEFAULT_FLAVORS: Flavor[] = [
  { id: "1", name: "Vanille", color: "#FFF3B0", emoji: "🍦", availableToday: true },
  { id: "2", name: "Chocolat", color: "#8B4513", emoji: "🍫", availableToday: true },
  { id: "3", name: "Fraise", color: "#FF6B9D", emoji: "🍓", availableToday: false },
  { id: "4", name: "Pistache", color: "#90C97A", emoji: "🌿", availableToday: false },
  { id: "5", name: "Citron", color: "#FFE135", emoji: "🍋", availableToday: false },
];

export const useGlacifyStore = create<GlacifyState>((set, get) => ({
  flavors: DEFAULT_FLAVORS,
  people: [],
  sessions: [],
  currentOrders: [],

  addFlavor: (name, color, emoji) => {
    const newFlavor: Flavor = {
      id: Date.now().toString(),
      name,
      color,
      emoji,
      availableToday: false,
    };
    set((s) => ({ flavors: [...s.flavors, newFlavor] }));
    get().saveToStorage();
  },

  removeFlavor: (id) => {
    set((s) => ({ flavors: s.flavors.filter((f) => f.id !== id) }));
    get().saveToStorage();
  },

  toggleAvailableToday: (id) => {
    set((s) => ({
      flavors: s.flavors.map((f) =>
        f.id === id ? { ...f, availableToday: !f.availableToday } : f
      ),
    }));
    get().saveToStorage();
  },

  addPerson: (name) => {
    const newPerson: Person = {
      id: Date.now().toString(),
      name,
      isFavorite: false,
      totalScoops: 0,
      flavorStats: {},
      sessionCount: 0,
    };
    set((s) => ({ people: [...s.people, newPerson] }));
    get().saveToStorage();
  },

  toggleFavorite: (id) => {
    set((s) => ({
      people: s.people.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      ),
    }));
    get().saveToStorage();
  },

  setCurrentOrders: (orders) => set({ currentOrders: orders }),

  saveSession: () => {
    const { currentOrders, people, sessions } = get();
    const newSession: Session = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      orders: currentOrders,
    };

    const updatedPeople = people.map((person) => {
      const order = currentOrders.find((o) => o.personId === person.id);
      if (!order) return person;
      const totalScoopsAdded = order.scoops.reduce((sum, s) => sum + s.count, 0);
      const updatedFlavorStats = { ...person.flavorStats };
      order.scoops.forEach((s) => {
        updatedFlavorStats[s.flavorId] = (updatedFlavorStats[s.flavorId] || 0) + s.count;
      });
      return {
        ...person,
        totalScoops: person.totalScoops + totalScoopsAdded,
        flavorStats: updatedFlavorStats,
        sessionCount: person.sessionCount + 1,
      };
    });

    set({
      sessions: [...sessions, newSession],
      people: updatedPeople,
      currentOrders: [],
    });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const [flavors, people, sessions] = await Promise.all([
        AsyncStorage.getItem("glacify_flavors"),
        AsyncStorage.getItem("glacify_people"),
        AsyncStorage.getItem("glacify_sessions"),
      ]);
      set({
        flavors: flavors ? JSON.parse(flavors) : DEFAULT_FLAVORS,
        people: people ? JSON.parse(people) : [],
        sessions: sessions ? JSON.parse(sessions) : [],
      });
    } catch (e) {
      console.error("Erreur chargement storage", e);
    }
  },

  saveToStorage: async () => {
    const { flavors, people, sessions } = get();
    try {
      await Promise.all([
        AsyncStorage.setItem("glacify_flavors", JSON.stringify(flavors)),
        AsyncStorage.setItem("glacify_people", JSON.stringify(people)),
        AsyncStorage.setItem("glacify_sessions", JSON.stringify(sessions)),
      ]);
    } catch (e) {
      console.error("Erreur sauvegarde storage", e);
    }
  },
}));
