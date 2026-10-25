import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { FREE_LIMITS } from "@contracts/plans";
import { orders, rounds } from "@db/schema";
import { authedQuery, createRouter } from "./middleware";
import { newRoundCode } from "./lib/codes";
import { isPremium } from "./lib/entitlements";
import { getDb } from "./queries/connection";
import { loadMenu } from "./queries/menu";
import {
  assertOpenRoundRoom,
  assertOrderRoom,
  notFound,
  orderDto,
  ownedRound,
  roundOrders,
} from "./queries/rounds";
import { assertValidOrder, orderInput } from "./order-input";

const id = z.number().int();

async function ownedOrder(userId: number, orderId: number) {
  const [row] = await getDb()
    .select({ order: orders, round: rounds })
    .from(orders)
    .innerJoin(rounds, eq(rounds.id, orders.roundId))
    .where(and(eq(orders.id, orderId), eq(rounds.userId, userId)))
    .limit(1);
  return row ?? notFound("Commande introuvable");
}

export const roundsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const list = await db
      .select()
      .from(rounds)
      .where(eq(rounds.userId, ctx.user.id))
      .orderBy(desc(rounds.createdAt), desc(rounds.id))
      .limit(60);
    const ids = list.map((r) => r.id);
    const counts = ids.length
      ? await db
          .select({
            roundId: orders.roundId,
            orders: sql<number>`count(*)`.mapWith(Number),
            served: sql<number>`sum(${orders.servedAt} is not null)`.mapWith(Number),
            scoops: sql<number>`sum(json_length(${orders.scoops}))`.mapWith(Number),
          })
          .from(orders)
          .where(inArray(orders.roundId, ids))
          .groupBy(orders.roundId)
      : [];
    const byRound = new Map(counts.map((c) => [c.roundId, c]));
    return list.map((r) => ({
      id: r.id,
      title: r.title,
      code: r.code,
      status: r.status,
      createdAt: r.createdAt,
      orders: byRound.get(r.id)?.orders ?? 0,
      served: byRound.get(r.id)?.served ?? 0,
      scoops: byRound.get(r.id)?.scoops ?? 0,
    }));
  }),

  create: authedQuery
    .input(z.object({ title: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await assertOpenRoundRoom(ctx.user);
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const [res] = await getDb()
            .insert(rounds)
            .values({ userId: ctx.user.id, title: input.title, code: newRoundCode(), checks: [] });
          return { id: res.insertId };
        } catch (e) {
          // Two rounds drew the same code: draw again
          if ((e as { cause?: { code?: string } }).cause?.code !== "ER_DUP_ENTRY") throw e;
        }
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Réessayez" });
    }),

  get: authedQuery.input(z.object({ id })).query(async ({ ctx, input }) => {
    const round = await ownedRound(ctx.user.id, input.id);
    const [list, menu] = await Promise.all([roundOrders(round.id), loadMenu(ctx.user.id)]);
    const premium = isPremium(ctx.user);
    return {
      round: {
        id: round.id,
        title: round.title,
        code: round.code,
        status: round.status,
        checks: round.checks,
        createdAt: round.createdAt,
      },
      orders: list.map(orderDto),
      menu,
      limits: { premium, ordersPerRound: premium ? null : FREE_LIMITS.ordersPerRound },
    };
  }),

  rename: authedQuery
    .input(z.object({ id, title: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ownedRound(ctx.user.id, input.id);
      await getDb().update(rounds).set({ title: input.title }).where(eq(rounds.id, input.id));
      return { success: true };
    }),

  /** Closed: the link stops taking orders, the round goes to the history. */
  setStatus: authedQuery
    .input(z.object({ id, status: z.enum(["open", "closed"]) }))
    .mutation(async ({ ctx, input }) => {
      const round = await ownedRound(ctx.user.id, input.id);
      if (round.status === input.status) return { success: true };
      if (input.status === "open") await assertOpenRoundRoom(ctx.user);
      await getDb()
        .update(rounds)
        .set({ status: input.status, closedAt: input.status === "closed" ? new Date() : null })
        .where(eq(rounds.id, round.id));
      return { success: true };
    }),

  remove: authedQuery.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const round = await ownedRound(ctx.user.id, input.id);
    await getDb().transaction(async (tx) => {
      await tx.delete(orders).where(eq(orders.roundId, round.id));
      await tx.delete(rounds).where(eq(rounds.id, round.id));
    });
    return { success: true };
  }),

  /** Ticks or unticks one service step. */
  setCheck: authedQuery
    .input(z.object({ id, key: z.string().min(1).max(80), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const round = await ownedRound(ctx.user.id, input.id);
      const checks = new Set(round.checks);
      if (input.done) checks.add(input.key);
      else checks.delete(input.key);
      await getDb()
        .update(rounds)
        .set({ checks: [...checks].slice(-300) })
        .where(eq(rounds.id, round.id));
      return { success: true };
    }),

  /** Starts the service over: no step ticked, nobody served. */
  resetService: authedQuery.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const round = await ownedRound(ctx.user.id, input.id);
    await getDb().transaction(async (tx) => {
      await tx.update(rounds).set({ checks: [] }).where(eq(rounds.id, round.id));
      await tx.update(orders).set({ servedAt: null }).where(eq(orders.roundId, round.id));
    });
    return { success: true };
  }),

  /** The host takes an order (new or changed) for someone at the table. */
  saveOrder: authedQuery
    .input(orderInput.extend({ roundId: id, id: id.optional() }))
    .mutation(async ({ ctx, input }) => {
      const { roundId, id: orderId, ...order } = input;
      const round = await ownedRound(ctx.user.id, roundId);
      assertValidOrder(await loadMenu(ctx.user.id), order, false);
      const values = { ...order, note: order.note || null };
      if (orderId) {
        const [res] = await getDb()
          .update(orders)
          .set(values)
          .where(and(eq(orders.id, orderId), eq(orders.roundId, round.id)));
        if (!res.affectedRows) notFound("Commande introuvable");
        return { id: orderId };
      }
      await assertOrderRoom(ctx.user, round.id);
      const [res] = await getDb()
        .insert(orders)
        .values({ ...values, roundId: round.id, source: "host" });
      return { id: res.insertId };
    }),

  removeOrder: authedQuery.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const { order } = await ownedOrder(ctx.user.id, input.id);
    await getDb().delete(orders).where(eq(orders.id, order.id));
    return { success: true };
  }),

  setServed: authedQuery.input(z.object({ id, served: z.boolean() })).mutation(async ({ ctx, input }) => {
    const { order } = await ownedOrder(ctx.user.id, input.id);
    await getDb()
      .update(orders)
      .set({ servedAt: input.served ? new Date() : null })
      .where(eq(orders.id, order.id));
    return { success: true };
  }),
});
