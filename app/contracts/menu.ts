/** The carte: what a host can serve. Shared by the API and the app. */

export type ContainerKind = "cone" | "cup";

export type Flavor = {
  id: number;
  name: string;
  /** #RRGGBB, the colour of the scoop */
  color: string;
  available: boolean;
  /** Removed from the carte but still named in past orders */
  archived: boolean;
};

export type Topping = { id: number; name: string; available: boolean; archived: boolean };

export type Container = {
  id: number;
  name: string;
  /** In a cone the scoops are stacked in order; in a cup the order is free */
  kind: ContainerKind;
  maxScoops: number;
  available: boolean;
  archived: boolean;
};

export type Menu = { flavors: Flavor[]; toppings: Topping[]; containers: Container[] };

export const DEFAULT_FLAVORS: { name: string; color: string }[] = [
  { name: "Vanille", color: "#F2E3B3" },
  { name: "Chocolat", color: "#6B3F2A" },
  { name: "Fraise", color: "#F29BB0" },
  { name: "Pistache", color: "#A9CF8A" },
  { name: "Caramel beurre salé", color: "#D49A5B" },
  { name: "Citron", color: "#F5E06A" },
  { name: "Menthe chocolat", color: "#9FE0C8" },
  { name: "Mangue", color: "#FFB547" },
  { name: "Framboise", color: "#D9416A" },
  { name: "Café", color: "#9C6B4E" },
  { name: "Noix de coco", color: "#F3F0EA" },
  { name: "Stracciatella", color: "#E8E0D2" },
];

export const DEFAULT_TOPPINGS = [
  "Chantilly",
  "Coulis chocolat",
  "Coulis fruits rouges",
  "Amandes grillées",
  "Vermicelles",
  "Gaufrette",
];

export const DEFAULT_CONTAINERS: { name: string; kind: ContainerKind; maxScoops: number }[] = [
  { name: "Cornet", kind: "cone", maxScoops: 3 },
  { name: "Pot", kind: "cup", maxScoops: 4 },
];

/** Picker swatches for new flavors. */
export const FLAVOR_PALETTE = [
  "#F2E3B3", "#6B3F2A", "#F29BB0", "#A9CF8A", "#D49A5B", "#F5E06A",
  "#9FE0C8", "#FFB547", "#D9416A", "#9C6B4E", "#F3F0EA", "#B9A3E3",
  "#7FB8E8", "#E86A4A", "#3E2A22", "#C8E06A",
];

export const MAX_SCOOPS = 6;

/** Dark text on light scoops, white on dark ones. */
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C1917" : "#FFFFFF";
}
