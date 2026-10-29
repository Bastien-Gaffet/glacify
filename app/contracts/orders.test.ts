import { describe, expect, it } from "vitest";
import { orderProblem } from "./orders";
import type { Menu } from "./menu";

const menu: Menu = {
  flavors: [
    { id: 1, name: "Vanille", color: "#fff", available: true, archived: false },
    { id: 2, name: "Mangue", color: "#fff", available: false, archived: false },
    { id: 3, name: "Ancien", color: "#fff", available: true, archived: true },
  ],
  toppings: [{ id: 10, name: "Chantilly", available: true, archived: false }],
  containers: [{ id: 100, name: "Cornet", kind: "cone", maxScoops: 2, available: true, archived: false }],
};
const base = { name: "Alice", containerId: 100, scoops: [1], toppings: [] as number[] };

describe("orderProblem", () => {
  it("accepts a valid order", () => {
    expect(orderProblem(menu, { ...base, toppings: [10] }, { guest: true })).toBeNull();
  });
  it("needs a scoop and respects the container size", () => {
    expect(orderProblem(menu, { ...base, scoops: [] }, { guest: false })).toEqual({ code: "order.noScoop" });
    expect(orderProblem(menu, { ...base, scoops: [1, 1, 1] }, { guest: false })).toMatchObject({ code: "order.maxScoops", params: { max: 2 } });
  });
  it("lets the host, not guests, use a flavor that ran out", () => {
    expect(orderProblem(menu, { ...base, scoops: [2] }, { guest: true })).not.toBeNull();
    expect(orderProblem(menu, { ...base, scoops: [2] }, { guest: false })).toBeNull();
  });
  it("refuses removed items, unknown ids and duplicate toppings", () => {
    expect(orderProblem(menu, { ...base, scoops: [3] }, { guest: false })).not.toBeNull();
    expect(orderProblem(menu, { ...base, containerId: 5 }, { guest: false })).not.toBeNull();
    expect(orderProblem(menu, { ...base, toppings: [10, 10] }, { guest: false })).not.toBeNull();
  });
});
