import { and, asc, eq } from "drizzle-orm";
import { DEFAULT_CONTAINERS, DEFAULT_FLAVORS, DEFAULT_TOPPINGS, type Menu } from "@contracts/menu";
import { containers, flavors, toppings } from "@db/schema";
import { getDb } from "./connection";

const bool = (v: number) => v === 1;

/** The host's whole carte, archived items included (past orders still name them). */
export async function loadMenu(userId: number): Promise<Menu> {
  const db = getDb();
  const [f, t, c] = await Promise.all([
    db.select().from(flavors).where(eq(flavors.userId, userId)).orderBy(asc(flavors.position), asc(flavors.id)),
    db.select().from(toppings).where(eq(toppings.userId, userId)).orderBy(asc(toppings.position), asc(toppings.id)),
    db
      .select()
      .from(containers)
      .where(eq(containers.userId, userId))
      .orderBy(asc(containers.position), asc(containers.id)),
  ]);
  return {
    flavors: f.map((x) => ({
      id: x.id,
      name: x.name,
      color: x.color,
      available: bool(x.available),
      archived: bool(x.archived),
    })),
    toppings: t.map((x) => ({ id: x.id, name: x.name, available: bool(x.available), archived: bool(x.archived) })),
    containers: c.map((x) => ({
      id: x.id,
      name: x.name,
      kind: x.kind,
      maxScoops: x.maxScoops,
      available: bool(x.available),
      archived: bool(x.archived),
    })),
  };
}

/** A new host starts with a classic carte, ready to serve. */
export async function seedMenu(userId: number) {
  const db = getDb();
  await db.insert(flavors).values(DEFAULT_FLAVORS.map((f, i) => ({ ...f, userId, position: i })));
  await db.insert(toppings).values(DEFAULT_TOPPINGS.map((name, i) => ({ name, userId, position: i })));
  await db.insert(containers).values(DEFAULT_CONTAINERS.map((c, i) => ({ ...c, userId, position: i })));
}

/** Puts back the default items missing from the carte (by name), without touching the others. */
export async function restoreDefaults(userId: number) {
  const db = getDb();
  const menu = await loadMenu(userId);
  const live = (items: { name: string; archived: boolean }[]) =>
    new Set(items.filter((x) => !x.archived).map((x) => x.name.toLowerCase()));
  const has = { f: live(menu.flavors), t: live(menu.toppings), c: live(menu.containers) };
  const end = (n: number) => n + 1000;
  const f = DEFAULT_FLAVORS.filter((x) => !has.f.has(x.name.toLowerCase()));
  const t = DEFAULT_TOPPINGS.filter((x) => !has.t.has(x.toLowerCase()));
  const c = DEFAULT_CONTAINERS.filter((x) => !has.c.has(x.name.toLowerCase()));
  if (f.length) await db.insert(flavors).values(f.map((x, i) => ({ ...x, userId, position: end(i) })));
  if (t.length) await db.insert(toppings).values(t.map((name, i) => ({ name, userId, position: end(i) })));
  if (c.length) await db.insert(containers).values(c.map((x, i) => ({ ...x, userId, position: end(i) })));
  return f.length + t.length + c.length;
}

export const ownedBy = {
  flavors: (userId: number, id: number) => and(eq(flavors.userId, userId), eq(flavors.id, id)),
  toppings: (userId: number, id: number) => and(eq(toppings.userId, userId), eq(toppings.id, id)),
  containers: (userId: number, id: number) => and(eq(containers.userId, userId), eq(containers.id, id)),
};
