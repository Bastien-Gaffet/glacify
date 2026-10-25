// Turns a list of individual orders into a production-friendly service plan:
// scoops are grouped flavor by flavor, layer by layer (a cone must get its
// bottom scoop before the next one), so the server opens each tub as few
// times as possible.

export const MAX_SCOOPS = 4;

export function countFlavors(orders) {
  const counts = new Map();
  for (const o of orders) {
    for (const f of o.scoops) counts.set(f, (counts.get(f) || 0) + 1);
  }
  return counts;
}

export function buildPlan({ flavors, toppings, orders }) {
  const flavorById = new Map(flavors.map((f) => [f.id, f]));
  const rank = new Map(flavors.map((f, i) => [f.id, i]));
  const active = orders.filter((o) => o.scoops.length > 0);
  const counts = countFlavors(active);

  // Most-used flavors first, catalogue order on ties.
  const cmp = (a, b) =>
    counts.get(b) - counts.get(a) || (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity);

  // In a cup the stacking order doesn't matter, so line scoops up with the
  // most popular flavors to share tubs within each layer. Cones keep the
  // order the customer asked for.
  const arranged = active.map((order) => ({
    order,
    scoops: order.container === 'pot' ? [...order.scoops].sort(cmp) : order.scoops,
  }));

  const depth = Math.max(0, ...arranged.map((a) => a.scoops.length));
  const layers = [];
  for (let i = 0; i < depth; i++) {
    const groups = new Map();
    for (const a of arranged) {
      const f = a.scoops[i];
      if (f === undefined) continue;
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f).push(a.order);
    }
    layers.push(
      [...groups]
        .map(([flavorId, people]) => ({ flavorId, flavor: flavorById.get(flavorId), people }))
        .sort((x, y) => y.people.length - x.people.length || cmp(x.flavorId, y.flavorId)),
    );
  }

  const toppingGroups = toppings
    .map((topping) => ({ topping, people: active.filter((o) => o.toppings.includes(topping.id)) }))
    .filter((g) => g.people.length > 0);

  const totals = [...counts.keys()]
    .sort(cmp)
    .map((flavorId) => ({ flavorId, flavor: flavorById.get(flavorId), count: counts.get(flavorId) }));

  return {
    orders: active,
    layers,
    toppingGroups,
    totals,
    containers: {
      cornet: active.filter((o) => o.container === 'cornet').length,
      pot: active.filter((o) => o.container === 'pot').length,
    },
    scoopCount: active.reduce((n, o) => n + o.scoops.length, 0),
  };
}
