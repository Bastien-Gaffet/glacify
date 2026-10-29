import { z } from "zod";
import { and, count, eq, max } from "drizzle-orm";
import { HARD_LIMITS } from "@contracts/plans";
import { MAX_SCOOPS } from "@contracts/menu";
import { CONTAINER_KINDS, containers, flavors, toppings } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { fail } from "./lib/fail";
import { loadMenu, ownedBy, restoreDefaults } from "./queries/menu";

const name = (len: number) => z.string().trim().min(1).max(len);
const tables = { flavors, toppings, containers } as const;
const kind = z.enum(["flavors", "toppings", "containers"]);

async function nextPosition(table: typeof flavors | typeof toppings | typeof containers, userId: number) {
  const [row] = await getDb()
    .select({ n: count(), last: max(table.position) })
    .from(table)
    .where(and(eq(table.userId, userId), eq(table.archived, 0)));
  return { count: row.n, position: (row.last ?? -1) + 1 };
}

function notFound(): never {
  fail("NOT_FOUND", "notFound");
}

export const menuRouter = createRouter({
  get: authedQuery.query(({ ctx }) => loadMenu(ctx.user.id)),

  saveFlavor: authedQuery
    .input(
      z.object({
        id: z.number().int().optional(),
        name: name(60),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        available: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values = { name: input.name, color: input.color.toUpperCase(), available: input.available ? 1 : 0 };
      if (input.id) {
        const [res] = await getDb().update(flavors).set(values).where(ownedBy.flavors(ctx.user.id, input.id));
        if (!res.affectedRows) notFound();
        return { id: input.id };
      }
      const next = await nextPosition(flavors, ctx.user.id);
      if (next.count >= HARD_LIMITS.flavors) fail("FORBIDDEN", "menu.flavorsFull");
      const [res] = await getDb()
        .insert(flavors)
        .values({ ...values, userId: ctx.user.id, position: next.position });
      return { id: res.insertId };
    }),

  saveTopping: authedQuery
    .input(z.object({ id: z.number().int().optional(), name: name(60), available: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const values = { name: input.name, available: input.available ? 1 : 0 };
      if (input.id) {
        const [res] = await getDb().update(toppings).set(values).where(ownedBy.toppings(ctx.user.id, input.id));
        if (!res.affectedRows) notFound();
        return { id: input.id };
      }
      const next = await nextPosition(toppings, ctx.user.id);
      if (next.count >= HARD_LIMITS.toppings) fail("FORBIDDEN", "menu.listFull");
      const [res] = await getDb()
        .insert(toppings)
        .values({ ...values, userId: ctx.user.id, position: next.position });
      return { id: res.insertId };
    }),

  saveContainer: authedQuery
    .input(
      z.object({
        id: z.number().int().optional(),
        name: name(40),
        kind: z.enum(CONTAINER_KINDS),
        maxScoops: z.number().int().min(1).max(MAX_SCOOPS),
        available: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const values = { ...rest, available: input.available ? 1 : 0 };
      if (id) {
        const [res] = await getDb().update(containers).set(values).where(ownedBy.containers(ctx.user.id, id));
        if (!res.affectedRows) notFound();
        return { id };
      }
      const next = await nextPosition(containers, ctx.user.id);
      if (next.count >= HARD_LIMITS.containers) fail("FORBIDDEN", "menu.listFull");
      const [res] = await getDb()
        .insert(containers)
        .values({ ...values, userId: ctx.user.id, position: next.position });
      return { id: res.insertId };
    }),

  /** Out of stock today, or back. */
  setAvailable: authedQuery
    .input(z.object({ kind, id: z.number().int(), available: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const table = tables[input.kind];
      const [res] = await getDb()
        .update(table)
        .set({ available: input.available ? 1 : 0 })
        .where(ownedBy[input.kind](ctx.user.id, input.id));
      if (!res.affectedRows) notFound();
      return { success: true };
    }),

  /** Off the carte for good; past orders keep naming it. */
  remove: authedQuery.input(z.object({ kind, id: z.number().int() })).mutation(async ({ ctx, input }) => {
    if (input.kind === "containers") {
      const menu = await loadMenu(ctx.user.id);
      if (menu.containers.filter((c) => !c.archived && c.id !== input.id).length === 0)
        fail("BAD_REQUEST", "menu.keepOneContainer");
    }
    const [res] = await getDb()
      .update(tables[input.kind])
      .set({ archived: 1 })
      .where(ownedBy[input.kind](ctx.user.id, input.id));
    if (!res.affectedRows) notFound();
    return { success: true };
  }),

  /** New order of one list, as the ids shown on screen. */
  reorder: authedQuery
    .input(z.object({ kind, ids: z.array(z.number().int()).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const table = tables[input.kind];
      await getDb().transaction(async (tx) => {
        for (const [position, id] of input.ids.entries()) {
          await tx.update(table).set({ position }).where(ownedBy[input.kind](ctx.user.id, id));
        }
      });
      return { success: true };
    }),

  restoreDefaults: authedQuery
    .input(z.object({ lang: z.enum(["fr", "en"]).default("fr") }))
    .mutation(async ({ ctx, input }) => ({ added: await restoreDefaults(ctx.user.id, input.lang) })),
});
