import type { Menu } from "@contracts/menu";
import { i18n } from "./i18n";

/** "3 cornets": the carte's own names, made plural the French and English way */
export const plural = (n: number, one: string, many = `${one}${/[sxz]$/i.test(one) ? "" : "s"}`) => `${n} ${n > 1 || (n === 0 && i18n().lang === "en") ? many : one}`;

/** "chocolat, vanille et mangue" */
export const listOf = (items: string[]) => {
  const { t } = i18n();
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${t("and")} ${items.at(-1)}` : (items[0] ?? "");
};

export function lookup(menu: Menu) {
  const { t } = i18n();
  const f = new Map(menu.flavors.map((x) => [x.id, x]));
  const tp = new Map(menu.toppings.map((x) => [x.id, x]));
  const c = new Map(menu.containers.map((x) => [x.id, x]));
  return {
    flavor: (id: number) => f.get(id) ?? { id, name: t("removedFlavor"), color: "#D6D3D1", available: false, archived: true },
    topping: (id: number) => tp.get(id) ?? { id, name: t("removedTopping"), available: false, archived: true },
    container: (id: number) =>
      c.get(id) ?? { id, name: t("containerFallback"), kind: "cup" as const, maxScoops: 4, available: false, archived: true },
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
  return new Date(d).toLocaleDateString(i18n().locale, { weekday: "short", day: "numeric", month: "short" });
}
