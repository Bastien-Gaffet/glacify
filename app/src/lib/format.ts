import type { Menu } from "@contracts/menu";

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function lookup(menu: Menu) {
  const f = new Map(menu.flavors.map((x) => [x.id, x]));
  const t = new Map(menu.toppings.map((x) => [x.id, x]));
  const c = new Map(menu.containers.map((x) => [x.id, x]));
  return {
    flavor: (id: number) => f.get(id) ?? { id, name: "Parfum retiré", color: "#D6D3D1", available: false, archived: true },
    topping: (id: number) => t.get(id) ?? { id, name: "Supplément retiré", available: false, archived: true },
    container: (id: number) =>
      c.get(id) ?? { id, name: "Contenant", kind: "cup" as const, maxScoops: 4, available: false, archived: true },
  };
}

/** "Cornet · 2 Vanille, Fraise · Chantilly" */
export function describeOrder(menu: Menu, order: { containerId: number; scoops: number[]; toppings: number[] }) {
  const l = lookup(menu);
  const counts = new Map<number, number>();
  for (const id of order.scoops) counts.set(id, (counts.get(id) ?? 0) + 1);
  const scoops = [...counts].map(([id, n]) => (n > 1 ? `${n} ` : "") + l.flavor(id).name).join(", ");
  return [l.container(order.containerId).name, scoops, ...order.toppings.map((id) => l.topping(id).name)]
    .filter(Boolean)
    .join(" · ");
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "G"
  );
}

export function shortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
