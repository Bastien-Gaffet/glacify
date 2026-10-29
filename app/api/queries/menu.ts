import { and, asc, eq } from "drizzle-orm";
import { DEFAULT_ACCENT, DEFAULT_CONTAINERS, DEFAULT_FLAVORS, DEFAULT_TOPPINGS, FLAVOR_PATTERNS, type FlavorPattern, type Menu, type MenuLang } from "@contracts/menu";
import { containers, flavors, toppings } from "@db/schema";
import { getDb } from "./connection";

const bool = (v: number) => v === 1;
const pattern = (v: string): FlavorPattern => ((FLAVOR_PATTERNS as readonly string[]).includes(v) ? (v as FlavorPattern) : "none");
/** A default flavor as a row: its name in the host's language, its look */
const defaultFlavor = (f: (typeof DEFAULT_FLAVORS)[number], lang: MenuLang) => ({
  name: f[lang],
  color: f.color,
  pattern: f.pattern ?? "none",
  accent: f.accent ?? DEFAULT_ACCENT,
});

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
      pattern: pattern(x.pattern),
      accent: x.accent,
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

/** A new host starts with a classic carte, ready to serve, in their language. */
export async function seedMenu(userId: number, lang: MenuLang) {
  const db = getDb();
  await db.insert(flavors).values(DEFAULT_FLAVORS.map((f, i) => ({ ...defaultFlavor(f, lang), userId, position: i })));
  await db.insert(toppings).values(DEFAULT_TOPPINGS.map((t, i) => ({ name: t[lang], userId, position: i })));
  await db.insert(containers).values(DEFAULT_CONTAINERS.map((c, i) => ({ name: c[lang], kind: c.kind, maxScoops: c.maxScoops, userId, position: i })));
}

/**
 * Puts back the default items missing from the carte, without touching the
 * others. An item counts as there under its name in any language, so a host
 * who switched language gets no duplicates.
 */
export async function restoreDefaults(userId: number, lang: MenuLang) {
  const db = getDb();
  const menu = await loadMenu(userId);
  const live = (items: { name: string; archived: boolean }[]) =>
    new Set(items.filter((x) => !x.archived).map((x) => x.name.toLowerCase()));
  const has = { f: live(menu.flavors), t: live(menu.toppings), c: live(menu.containers) };
  const missing = (set: Set<string>) => (x: { fr: string; en: string }) => !set.has(x.fr.toLowerCase()) && !set.has(x.en.toLowerCase());
  const end = (n: number) => n + 1000;
  const f = DEFAULT_FLAVORS.filter(missing(has.f));
  const t = DEFAULT_TOPPINGS.filter(missing(has.t));
  const c = DEFAULT_CONTAINERS.filter(missing(has.c));
  if (f.length) await db.insert(flavors).values(f.map((x, i) => ({ ...defaultFlavor(x, lang), userId, position: end(i) })));
  if (t.length) await db.insert(toppings).values(t.map((x, i) => ({ name: x[lang], userId, position: end(i) })));
  if (c.length)
    await db.insert(containers).values(c.map((x, i) => ({ name: x[lang], kind: x.kind, maxScoops: x.maxScoops, userId, position: end(i) })));
  return f.length + t.length + c.length;
}

export const ownedBy = {
  flavors: (userId: number, id: number) => and(eq(flavors.userId, userId), eq(flavors.id, id)),
  toppings: (userId: number, id: number) => and(eq(toppings.userId, userId), eq(toppings.id, id)),
  containers: (userId: number, id: number) => and(eq(containers.userId, userId), eq(containers.id, id)),
};
