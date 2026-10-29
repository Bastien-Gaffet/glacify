import type { Container, Flavor, Menu, Topping } from "./menu";

/**
 * Turns individual orders into a production-friendly service plan: one step
 * per tub, most ordered flavor first, and each tub is opened only once. The
 * stacking order is free in cups and in cones alike, so every ice cream gets
 * its scoops in tub order. At each tub, the people are grouped by what their
 * container already holds, to tell an empty cup from one that has chocolate.
 */

export type PlanOrder = {
  id: number;
  name: string;
  containerId: number;
  scoops: number[];
  toppings: number[];
};

/** People whose container holds the same flavors when this tub is opened */
export type TubGroup<O> = {
  /** Flavors already in the container, in tub order; empty for an empty container */
  base: Flavor[];
  people: { order: O; count: number }[];
};

export type Tub<O> = { flavorId: number; flavor: Flavor; scoops: number; groups: TubGroup<O>[] };

const missingFlavor = (id: number, name: string): Flavor => ({
  id,
  name,
  color: "#D6D3D1",
  available: false,
  archived: true,
});

export function countFlavors(orders: { scoops: number[] }[]) {
  const counts = new Map<number, number>();
  for (const o of orders) for (const f of o.scoops) counts.set(f, (counts.get(f) ?? 0) + 1);
  return counts;
}

/** `removedName` names a flavor taken off the carte since it was ordered */
export function buildPlan<O extends PlanOrder>(orders: O[], menu: Menu, removedName = "Parfum retiré") {
  const flavorById = new Map(menu.flavors.map((f) => [f.id, f]));
  const flavor = (id: number) => flavorById.get(id) ?? missingFlavor(id, removedName);
  const rank = new Map(menu.flavors.map((f, i) => [f.id, i]));
  const active = orders.filter((o) => o.scoops.length > 0);
  const counts = countFlavors(active);

  // Tub order: most ordered flavors first, carte order on ties
  const tubOrder = [...counts.keys()].sort(
    (a, b) => counts.get(b)! - counts.get(a)! || (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity),
  );
  const tubRank = new Map(tubOrder.map((id, i) => [id, i]));

  /** Each ice cream's scoops in the order they are put in, bottom first */
  const placed = new Map(active.map((o) => [o.id, [...o.scoops].sort((a, b) => tubRank.get(a)! - tubRank.get(b)!)]));

  const tubs: Tub<O>[] = tubOrder.map((flavorId, i) => {
    const groups = new Map<string, TubGroup<O>>();
    for (const order of active) {
      const count = order.scoops.filter((f) => f === flavorId).length;
      if (!count) continue;
      const base = [...new Set(order.scoops)].filter((f) => tubRank.get(f)! < i).sort((a, b) => tubRank.get(a)! - tubRank.get(b)!);
      const key = base.join(",");
      if (!groups.has(key)) groups.set(key, { base: base.map(flavor), people: [] });
      groups.get(key)!.people.push({ order, count });
    }
    return {
      flavorId,
      flavor: flavor(flavorId),
      scoops: counts.get(flavorId)!,
      // Empty containers first, then the fullest bases last
      groups: [...groups.values()].sort((x, y) => x.base.length - y.base.length || y.people.length - x.people.length),
    };
  });

  const containers: { container: Container; count: number }[] = [];
  for (const c of menu.containers) {
    const count = active.filter((o) => o.containerId === c.id).length;
    if (count) containers.push({ container: c, count });
  }

  const toppingGroups: { topping: Topping; people: O[] }[] = menu.toppings
    .map((topping) => ({ topping, people: active.filter((o) => o.toppings.includes(topping.id)) }))
    .filter((g) => g.people.length > 0);

  return {
    orders: active,
    tubs,
    placed: (o: PlanOrder) => placed.get(o.id) ?? o.scoops,
    containers,
    toppingGroups,
    totals: tubs.map((t) => ({ flavor: t.flavor, count: t.scoops })),
    scoopCount: active.reduce((n, o) => n + o.scoops.length, 0),
  };
}

export type Plan<O extends PlanOrder> = ReturnType<typeof buildPlan<O>>;
