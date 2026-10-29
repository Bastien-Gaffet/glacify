import type { Plan, Tub, TubGroup } from "@contracts/plan";
import type { Container, Menu, Topping } from "@contracts/menu";
import { lookup, plural } from "@/lib/format";
import type { ServiceState } from "./useServiceState";
import type { RoundOrder } from "./types";

/**
 * Check keys. Each one carries its count, so a step ticked before an order
 * changed shows up again.
 */
export const checkKey = {
  container: (id: number, count: number) => `c:${id}:${count}`,
  tub: (flavorId: number, scoops: number) => `b:${flavorId}:${scoops}`,
  /** One person's scoops from one tub */
  scoop: (flavorId: number, orderId: number, count: number) => `p:${flavorId}:${orderId}:${count}`,
  topping: (id: number, count: number) => `t:${id}:${count}`,
  toppingFor: (id: number, orderId: number) => `tp:${id}:${orderId}`,
};

export type ScoopTile = { order: RoundOrder; count: number; key: string };
export type ToppingTile = { order: RoundOrder; key: string };

export type ServiceStep =
  | { id: "containers"; kind: "containers"; items: { container: Container; count: number; key: string }[] }
  | { id: string; kind: "tub"; tub: Tub<RoundOrder>; index: number; key: string; tiles: ScoopTile[] }
  | { id: "toppings"; kind: "toppings"; groups: { topping: Topping; key: string; tiles: ToppingTile[] }[] }
  | { id: "serve"; kind: "serve" };

/** The service, one screen per step. Step ids stay put when counts change. */
export function serviceSteps(plan: Plan<RoundOrder>): ServiceStep[] {
  const steps: ServiceStep[] = [
    {
      id: "containers",
      kind: "containers",
      items: plan.containers.map((c) => ({ ...c, key: checkKey.container(c.container.id, c.count) })),
    },
    ...plan.tubs.map(
      (tub, index): ServiceStep => ({
        id: `tub:${tub.flavorId}`,
        kind: "tub",
        tub,
        index,
        key: checkKey.tub(tub.flavorId, tub.scoops),
        tiles: tub.groups.flatMap((g) =>
          g.people.map(({ order, count }) => ({ order, count, key: checkKey.scoop(tub.flavorId, order.id, count) })),
        ),
      }),
    ),
  ];
  if (plan.toppingGroups.length > 0) {
    steps.push({
      id: "toppings",
      kind: "toppings",
      groups: plan.toppingGroups.map((g) => ({
        topping: g.topping,
        key: checkKey.topping(g.topping.id, g.people.length),
        tiles: g.people.map((order) => ({ order, key: checkKey.toppingFor(g.topping.id, order.id) })),
      })),
    });
  }
  steps.push({ id: "serve", kind: "serve" });
  return steps;
}

export const tileDone = (state: ServiceState, groupKey: string, tileKey: string) =>
  state.checks.has(groupKey) || state.checks.has(tileKey);

export function stepDone(step: ServiceStep, state: ServiceState, plan: Plan<RoundOrder>) {
  switch (step.kind) {
    case "containers":
      return step.items.every((i) => state.checks.has(i.key));
    case "tub":
      return state.checks.has(step.key) || step.tiles.every((t) => state.checks.has(t.key));
    case "toppings":
      return step.groups.every((g) => g.tiles.every((t) => tileDone(state, g.key, t.key)));
    case "serve":
      return plan.orders.every((o) => state.isServed(o.id));
  }
}

const listFr = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} et ${items.at(-1)}` : (items[0] ?? ""));

/** "Sur mangue et chocolat", "Dans 2 cornets et 1 pot vides" (container names are free, so no article) */
export function groupLabel(group: TubGroup<RoundOrder>, menu: Menu) {
  if (group.base.length) return `Sur ${listFr(group.base.map((f) => f.name.toLowerCase()))}`;
  const l = lookup(menu);
  const byContainer = new Map<number, number>();
  for (const { order } of group.people) byContainer.set(order.containerId, (byContainer.get(order.containerId) ?? 0) + 1);
  const parts = [...byContainer].map(([id, n]) => plural(n, l.container(id).name.toLowerCase()));
  return `Dans ${listFr(parts)} ${group.people.length > 1 ? "vides" : "vide"}`;
}
