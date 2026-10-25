import { describe, expect, it } from "vitest";
import { buildPlan, type PlanOrder } from "./plan";
import type { Menu } from "./menu";

const f = (id: number, name: string) => ({ id, name, color: "#ffffff", available: true, archived: false });
const menu: Menu = {
  flavors: [f(1, "Vanille"), f(2, "Chocolat"), f(3, "Fraise")],
  toppings: [{ id: 10, name: "Chantilly", available: true, archived: false }],
  containers: [
    { id: 100, name: "Cornet", kind: "cone", maxScoops: 3, available: true, archived: false },
    { id: 200, name: "Pot", kind: "cup", maxScoops: 4, available: true, archived: false },
  ],
};
let next = 1;
const order = (name: string, containerId: number, scoops: number[], toppings: number[] = []): PlanOrder => ({
  id: next++,
  name,
  containerId,
  scoops,
  toppings,
});
const ids = (groups: { flavorId: number; people: PlanOrder[] }[]) => groups.map((g) => [g.flavorId, g.people.map((p) => p.name)]);

describe("buildPlan", () => {
  it("is empty without orders", () => {
    const plan = buildPlan([], menu);
    expect(plan.layers).toEqual([]);
    expect(plan.scoopCount).toBe(0);
    expect(plan.containers).toEqual([]);
  });

  it("groups scoops by flavor, most used first", () => {
    const plan = buildPlan([order("a", 100, [3]), order("b", 100, [2]), order("c", 200, [2])], menu);
    expect(ids(plan.layers[0])).toEqual([
      [2, ["b", "c"]],
      [3, ["a"]],
    ]);
    expect(plan.containers.map((c) => [c.container.name, c.count])).toEqual([
      ["Cornet", 2],
      ["Pot", 1],
    ]);
    expect(plan.scoopCount).toBe(3);
  });

  it("keeps a cone's stacking order and rearranges cups to share tubs", () => {
    const plan = buildPlan([order("cone", 100, [3, 1]), order("cup", 200, [3, 1]), order("x", 200, [1])], menu);
    expect(ids(plan.layers[0])).toEqual([
      [1, ["cup", "x"]],
      [3, ["cone"]],
    ]);
    expect(ids(plan.layers[1])).toEqual([
      [1, ["cone"]],
      [3, ["cup"]],
    ]);
  });

  it("skips empty orders, lists toppings and totals, names removed flavors", () => {
    const plan = buildPlan([order("a", 200, [1, 1, 99], [10]), order("empty", 200, [])], menu);
    expect(plan.orders.map((o) => o.name)).toEqual(["a"]);
    expect(plan.totals.map((t) => [t.flavor.name, t.count])).toEqual([
      ["Vanille", 2],
      ["Parfum retiré", 1],
    ]);
    expect(plan.toppingGroups.map((g) => [g.topping.name, g.people.map((p) => p.name)])).toEqual([["Chantilly", ["a"]]]);
  });
});
