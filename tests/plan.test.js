import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/plan.js';

const flavors = [
  { id: 'vanille', name: 'Vanille' },
  { id: 'chocolat', name: 'Chocolat' },
  { id: 'fraise', name: 'Fraise' },
];
const toppings = [{ id: 'chantilly', name: 'Chantilly' }];
const order = (id, container, scoops, tops = []) => ({ id, name: id, container, scoops, toppings: tops });

test('empty order list gives an empty plan', () => {
  const plan = buildPlan({ flavors, toppings, orders: [] });
  assert.equal(plan.layers.length, 0);
  assert.equal(plan.scoopCount, 0);
  assert.deepEqual(plan.containers, { cornet: 0, pot: 0 });
});

test('groups scoops by flavor, most popular first', () => {
  const plan = buildPlan({
    flavors,
    toppings,
    orders: [
      order('a', 'cornet', ['fraise']),
      order('b', 'cornet', ['chocolat']),
      order('c', 'pot', ['chocolat']),
    ],
  });
  assert.equal(plan.layers.length, 1);
  assert.deepEqual(plan.layers[0].map((g) => [g.flavorId, g.people.map((p) => p.id)]), [
    ['chocolat', ['b', 'c']],
    ['fraise', ['a']],
  ]);
  assert.deepEqual(plan.containers, { cornet: 2, pot: 1 });
  assert.equal(plan.scoopCount, 3);
});

test('cones keep their stacking order, cups are rearranged to share tubs', () => {
  const plan = buildPlan({
    flavors,
    toppings,
    orders: [
      order('cone', 'cornet', ['fraise', 'vanille']),
      order('cup', 'pot', ['fraise', 'vanille']),
      order('x', 'pot', ['vanille']),
    ],
  });
  // vanille is the most used flavor, so the cup gets it first.
  assert.deepEqual(plan.layers[0].map((g) => [g.flavorId, g.people.map((p) => p.id)]), [
    ['vanille', ['cup', 'x']],
    ['fraise', ['cone']],
  ]);
  assert.deepEqual(plan.layers[1].map((g) => [g.flavorId, g.people.map((p) => p.id)]), [
    ['vanille', ['cone']],
    ['fraise', ['cup']],
  ]);
});

test('ignores orders without scoops and lists toppings and totals', () => {
  const plan = buildPlan({
    flavors,
    toppings,
    orders: [order('a', 'pot', ['vanille', 'vanille'], ['chantilly']), order('empty', 'pot', [])],
  });
  assert.equal(plan.orders.length, 1);
  assert.deepEqual(plan.totals.map((t) => [t.flavorId, t.count]), [['vanille', 2]]);
  assert.deepEqual(plan.toppingGroups.map((g) => [g.topping.id, g.people.map((p) => p.id)]), [
    ['chantilly', ['a']],
  ]);
});
