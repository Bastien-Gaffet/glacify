import { describe, expect, it } from "vitest";
import { buildPlan, type PlanOrder, type Tub } from "./plan";
import type { Menu } from "./menu";

const f = (id: number, name: string) => ({ id, name, color: "#ffffff", available: true, archived: false });
const menu: Menu = {
  flavors: [f(1, "Vanille"), f(2, "Chocolat"), f(3, "Fraise"), f(4, "Mangue")],
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
/** [tub flavor, [[base flavor names], [name × count]]] */
const tubs = (list: Tub<PlanOrder>[]) =>
  list.map((t) => [
    t.flavor.name,
    t.groups.map((g) => [g.base.map((b) => b.name), g.people.map((p) => (p.count > 1 ? `${p.order.name}×${p.count}` : p.order.name))]),
  ]);

describe("buildPlan", () => {
  it("is empty without orders", () => {
    const plan = buildPlan([], menu);
    expect(plan.tubs).toEqual([]);
    expect(plan.scoopCount).toBe(0);
    expect(plan.containers).toEqual([]);
  });

  it("opens each tub once, most ordered first, carte order on ties", () => {
    const plan = buildPlan(
      [order("a", 100, [2, 4]), order("b", 200, [4, 1]), order("c", 100, [4]), order("d", 200, [2, 3])],
      menu,
    );
    expect(plan.tubs.map((t) => [t.flavor.name, t.scoops])).toEqual([
      ["Mangue", 3],
      ["Chocolat", 2],
      ["Vanille", 1],
      ["Fraise", 1],
    ]);
    expect(plan.containers.map((c) => [c.container.name, c.count])).toEqual([
      ["Cornet", 2],
      ["Pot", 2],
    ]);
    expect(plan.scoopCount).toBe(7);
  });

  it("tells what each container already holds when a tub is opened, cones included", () => {
    const plan = buildPlan(
      [order("cone", 100, [2, 4]), order("cup", 200, [1, 2, 4]), order("x", 200, [4]), order("y", 200, [2, 1]), order("z", 200, [4])],
      menu,
    );
    expect(tubs(plan.tubs)).toEqual([
      ["Mangue", [[[], ["cone", "cup", "x", "z"]]]],
      [
        "Chocolat",
        [
          [[], ["y"]],
          [["Mangue"], ["cone", "cup"]],
        ],
      ],
      [
        "Vanille",
        [
          [["Chocolat"], ["y"]],
          [["Mangue", "Chocolat"], ["cup"]],
        ],
      ],
    ]);
    // The cone asked chocolate then mango: it gets them in tub order
    expect(plan.placed(plan.orders[0]!)).toEqual([4, 2]);
  });

  it("puts several scoops of one flavor in one go", () => {
    const plan = buildPlan([order("a", 200, [3, 1, 3]), order("b", 200, [3])], menu);
    expect(tubs(plan.tubs)).toEqual([
      ["Fraise", [[[], ["a×2", "b"]]]],
      ["Vanille", [[["Fraise"], ["a"]]]],
    ]);
    expect(plan.placed(plan.orders[0]!)).toEqual([3, 3, 1]);
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
