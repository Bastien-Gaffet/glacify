import type { Menu } from "./menu";
import type { AppError } from "./errors";

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
 * taken. Returns the problem (worded by the app), or null when the order is valid.
 */
export function orderProblem(menu: Menu, order: OrderInput, { guest }: { guest: boolean }): AppError | null {
  const usable = <T extends { available: boolean; archived: boolean }>(x: T | undefined) =>
    !!x && !x.archived && (!guest || x.available);
  const container = menu.containers.find((c) => c.id === order.containerId);
  if (!usable(container)) return { code: "order.containerUnavailable" };
  if (order.scoops.length === 0) return { code: "order.noScoop" };
  if (order.scoops.length > container!.maxScoops)
    return { code: "order.maxScoops", params: { max: container!.maxScoops, container: container!.name.toLowerCase() } };
  for (const id of order.scoops) {
    if (!usable(menu.flavors.find((f) => f.id === id))) return { code: "order.flavorUnavailable" };
  }
  if (new Set(order.toppings).size !== order.toppings.length) return { code: "order.toppingTwice" };
  for (const id of order.toppings) {
    if (!usable(menu.toppings.find((t) => t.id === id))) return { code: "order.toppingUnavailable" };
  }
  return null;
}
