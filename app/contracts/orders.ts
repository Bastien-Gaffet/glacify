import type { Menu } from "./menu";

export type OrderInput = {
  name: string;
  containerId: number;
  /** Flavor ids, bottom scoop first */
  scoops: number[];
  toppings: number[];
  note?: string;
};

/**
 * Checks an order against the host's carte. Guests may only pick what is
 * available today; the host may keep an item that ran out after the order was
 * taken. Returns an error message, or null when the order is valid.
 */
export function orderProblem(menu: Menu, order: OrderInput, { guest }: { guest: boolean }): string | null {
  const usable = <T extends { available: boolean; archived: boolean }>(x: T | undefined) =>
    !!x && !x.archived && (!guest || x.available);
  const container = menu.containers.find((c) => c.id === order.containerId);
  if (!usable(container)) return "Contenant indisponible";
  if (order.scoops.length === 0) return "Choisissez au moins une boule";
  if (order.scoops.length > container!.maxScoops)
    return `${container!.maxScoops} boules au maximum dans un ${container!.name.toLowerCase()}`;
  for (const id of order.scoops) {
    if (!usable(menu.flavors.find((f) => f.id === id))) return "Un parfum n'est plus disponible";
  }
  if (new Set(order.toppings).size !== order.toppings.length) return "Supplément en double";
  for (const id of order.toppings) {
    if (!usable(menu.toppings.find((t) => t.id === id))) return "Un supplément n'est plus disponible";
  }
  return null;
}
