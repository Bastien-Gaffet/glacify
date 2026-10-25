import type { Container, Flavor, Menu, Topping } from "./menu";

/**
 * Turns individual orders into a production-friendly service plan: scoops are
 * grouped flavor by flavor and layer by layer (a cone needs its bottom scoop
 * before the next one), so each tub is opened as few times as possible.
 */

export type PlanOrder = {
  id: number;
  name: string;
  containerId: number;
  scoops: number[];
  toppings: number[];
};

export type FlavorGroup<O> = { flavorId: number; flavor: Flavor; people: O[] };

const missingFlavor = (id: number): Flavor => ({
  id,
  name: "Parfum retiré",
  color: "#D6D3D1",
  available: false,
  archived: true,
});

export function countFlavors(orders: { scoops: number[] }[]) {
  const counts = new Map<number, number>();
  for (const o of orders) for (const f of o.scoops) counts.set(f, (counts.get(f) ?? 0) + 1);
  return counts;
}

export function buildPlan<O extends PlanOrder>(orders: O[], menu: Menu) {
  const flavorById = new Map(menu.flavors.map((f) => [f.id, f]));
  const flavor = (id: number) => flavorById.get(id) ?? missingFlavor(id);
  const rank = new Map(menu.flavors.map((f, i) => [f.id, i]));
  const containerById = new Map(menu.containers.map((c) => [c.id, c]));
  const active = orders.filter((o) => o.scoops.length > 0);
  const counts = countFlavors(active);

  // Most-used flavors first, carte order on ties
  const cmp = (a: number, b: number) =>
    counts.get(b)! - counts.get(a)! || (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity);

  // In a cup the stacking order is free: line scoops up with the most popular
  // flavors so they share tubs within each layer. Cones keep the asked order.
  const arranged = active.map((order) => ({
    order,
    scoops: containerById.get(order.containerId)?.kind === "cup" ? [...order.scoops].sort(cmp) : order.scoops,
  }));

  const depth = Math.max(0, ...arranged.map((a) => a.scoops.length));
  const layers: FlavorGroup<O>[][] = [];
  for (let i = 0; i < depth; i++) {
    const groups = new Map<number, O[]>();
    for (const a of arranged) {
      const f = a.scoops[i];
      if (f === undefined) continue;
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f)!.push(a.order);
    }
    layers.push(
      [...groups]
        .map(([flavorId, people]) => ({ flavorId, flavor: flavor(flavorId), people }))
        .sort((x, y) => y.people.length - x.people.length || cmp(x.flavorId, y.flavorId)),
    );
  }

  const containers: { container: Container; count: number }[] = [];
  for (const c of menu.containers) {
    const count = active.filter((o) => o.containerId === c.id).length;
    if (count) containers.push({ container: c, count });
  }

  const toppingGroups: { topping: Topping; people: O[] }[] = menu.toppings
    .map((topping) => ({ topping, people: active.filter((o) => o.toppings.includes(topping.id)) }))
    .filter((g) => g.people.length > 0);

  const totals = [...counts.keys()].sort(cmp).map((id) => ({ flavor: flavor(id), count: counts.get(id)! }));

  return {
    orders: active,
    layers,
    containers,
    toppingGroups,
    totals,
    scoopCount: active.reduce((n, o) => n + o.scoops.length, 0),
  };
}

export type Plan<O extends PlanOrder> = ReturnType<typeof buildPlan<O>>;
