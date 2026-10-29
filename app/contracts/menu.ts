/** The carte: what a host can serve. Shared by the API and the app. */

export type ContainerKind = "cone" | "cup";

/** Drawn over the scoop's colour: chocolate flecks, a caramel swirl, fruit chunks, vanilla seeds */
export const FLAVOR_PATTERNS = ["none", "flecks", "swirl", "chunks", "seeds"] as const;
export type FlavorPattern = (typeof FLAVOR_PATTERNS)[number];

/** How a scoop looks */
export type ScoopLook = { color: string; pattern: FlavorPattern; accent: string };

export type Flavor = ScoopLook & {
  id: number;
  name: string;
  available: boolean;
  /** Removed from the carte but still named in past orders */
  archived: boolean;
};

export type Topping = { id: number; name: string; available: boolean; archived: boolean };

export type Container = {
  id: number;
  name: string;
  /** Held in the hand or set on the table; the service orders the scoops the same way in both */
  kind: ContainerKind;
  maxScoops: number;
  available: boolean;
  archived: boolean;
};

export type Menu = { flavors: Flavor[]; toppings: Topping[]; containers: Container[] };

/** Languages the classic carte is written in (the app's languages) */
export type MenuLang = "fr" | "en";

export const DEFAULT_FLAVORS: ({ fr: string; en: string } & Partial<ScoopLook> & { color: string })[] = [
  { fr: "Vanille", en: "Vanilla", color: "#F2E3B3", pattern: "seeds", accent: "#3B2A20" },
  { fr: "Chocolat", en: "Chocolate", color: "#6B3F2A" },
  { fr: "Fraise", en: "Strawberry", color: "#F29BB0", pattern: "chunks", accent: "#C23A55" },
  { fr: "Pistache", en: "Pistachio", color: "#A9CF8A", pattern: "chunks", accent: "#6F9A4F" },
  { fr: "Caramel beurre salé", en: "Salted caramel", color: "#D49A5B", pattern: "swirl", accent: "#A5652B" },
  { fr: "Citron", en: "Lemon", color: "#F5E06A" },
  { fr: "Menthe chocolat", en: "Mint chocolate chip", color: "#9FE0C8", pattern: "flecks", accent: "#3E2A22" },
  { fr: "Mangue", en: "Mango", color: "#FFB547" },
  { fr: "Framboise", en: "Raspberry", color: "#D9416A", pattern: "seeds", accent: "#8E1F3D" },
  { fr: "Café", en: "Coffee", color: "#9C6B4E" },
  { fr: "Noix de coco", en: "Coconut", color: "#F3F0EA", pattern: "flecks", accent: "#C9BBA5" },
  { fr: "Stracciatella", en: "Stracciatella", color: "#E8E0D2", pattern: "flecks", accent: "#3E2A22" },
];

export const DEFAULT_TOPPINGS: { fr: string; en: string }[] = [
  { fr: "Chantilly", en: "Whipped cream" },
  { fr: "Coulis chocolat", en: "Chocolate sauce" },
  { fr: "Coulis fruits rouges", en: "Berry coulis" },
  { fr: "Amandes grillées", en: "Toasted almonds" },
  { fr: "Vermicelles", en: "Sprinkles" },
  { fr: "Gaufrette", en: "Wafer" },
];

export const DEFAULT_CONTAINERS: { fr: string; en: string; kind: ContainerKind; maxScoops: number }[] = [
  { fr: "Cornet", en: "Cone", kind: "cone", maxScoops: 3 },
  { fr: "Pot", en: "Cup", kind: "cup", maxScoops: 4 },
];

/** The pattern's colour when none was chosen: chocolate brown */
export const DEFAULT_ACCENT = "#3E2A22";

/** Picker swatches for a pattern: chocolate, caramel, fruit, nuts, cream */
export const ACCENT_PALETTE = ["#3E2A22", "#6B3F2A", "#1C1917", "#FFFFFF", "#A5652B", "#C23A55", "#8E1F3D", "#6F9A4F", "#F5E06A", "#C9BBA5", "#E86A4A", "#7FB8E8"];

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
