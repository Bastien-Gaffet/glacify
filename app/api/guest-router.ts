import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { HARD_LIMITS } from "@contracts/plans";
import { orders } from "@db/schema";
import { createRouter, publicQuery } from "./middleware";
import { newGuestToken, normalizeCode } from "./lib/codes";
import { MINUTE, perIp, rateLimit } from "./lib/rate-limit";
import { getDb } from "./queries/connection";
import { loadMenu } from "./queries/menu";
import { assertOrderRoom, notFound, orderDto, roundByCode, roundOrders } from "./queries/rounds";
import { assertValidOrder, orderInput } from "./order-input";

/**
 * The public side of a round: anyone with the link (/t/<code>) orders from
 * their own phone, without an account. Their browser keeps a secret token
 * that lets them change or cancel their own orders while the round is open.
 */

const code = z.string().trim().min(4).max(16).transform(normalizeCode);
const token = z.string().regex(/^[0-9a-f]{48}$/);

async function openRound(c: string) {
  const row = await roundByCode(c);
  if (row.round.status !== "open")
    throw new TRPCError({ code: "FORBIDDEN", message: "Les commandes sont fermées pour cette tournée" });
  return row;
}

async function guestOrder(roundId: number, t: string, id: number) {
  const [order] = await getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.roundId, roundId), eq(orders.guestToken, t)))
    .limit(1);
  if (!order) notFound("Commande introuvable");
  if (order.servedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Cette glace a déjà été servie" });
  return order;
}

export const guestRouter = createRouter({
  round: publicQuery.input(z.object({ code, token: token.optional() })).query(async ({ input }) => {
    const { round, host } = await roundByCode(input.code);
    const [list, menu] = await Promise.all([roundOrders(round.id), loadMenu(host.id)]);
    const visible = <T extends { archived: boolean }>(items: T[]) => items.filter((x) => !x.archived);
    return {
      title: round.title,
      hostName: host.name,
      open: round.status === "open",
      menu: { flavors: visible(menu.flavors), toppings: visible(menu.toppings), containers: visible(menu.containers) },
      // Others only see first names: who already ordered, who has been served
      orders: list.map((o) => ({ id: o.id, name: o.name, served: !!o.servedAt, mine: !!input.token && o.guestToken === input.token })),
      mine: input.token ? list.filter((o) => o.guestToken === input.token).map(orderDto) : [],
    };
  }),

  placeOrder: publicQuery
    .input(z.object({ code, token: token.optional(), order: orderInput }))
    .mutation(async ({ ctx, input }) => {
      rateLimit([
        perIp("guest-order", ctx.req.headers, 30, 10 * MINUTE),
        { key: `round-order:${input.code}`, limit: 200, windowMs: 60 * MINUTE },
      ]);
      const { round, host } = await openRound(input.code);
      const guestToken = input.token ?? newGuestToken();
      if (input.token) {
        const [{ n }] = await getDb()
          .select({ n: count() })
          .from(orders)
          .where(and(eq(orders.roundId, round.id), eq(orders.guestToken, guestToken)));
        if (n >= HARD_LIMITS.ordersPerGuest)
          throw new TRPCError({ code: "FORBIDDEN", message: "Vous avez déjà commandé beaucoup de glaces" });
      }
      assertValidOrder(await loadMenu(host.id), input.order, true);
      await assertOrderRoom(host, round.id);
      const [res] = await getDb()
        .insert(orders)
        .values({ ...input.order, note: input.order.note || null, roundId: round.id, source: "guest", guestToken });
      return { id: res.insertId, token: guestToken };
    }),

  updateOrder: publicQuery
    .input(z.object({ code, token, id: z.number().int(), order: orderInput }))
    .mutation(async ({ ctx, input }) => {
      rateLimit([perIp("guest-order", ctx.req.headers, 30, 10 * MINUTE)]);
      const { round, host } = await openRound(input.code);
      const order = await guestOrder(round.id, input.token, input.id);
      assertValidOrder(await loadMenu(host.id), input.order, true);
      await getDb()
        .update(orders)
        .set({ ...input.order, note: input.order.note || null })
        .where(and(eq(orders.id, order.id), isNull(orders.servedAt)));
      return { success: true };
    }),

  cancelOrder: publicQuery
    .input(z.object({ code, token, id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { round } = await openRound(input.code);
      const order = await guestOrder(round.id, input.token, input.id);
      await getDb().delete(orders).where(eq(orders.id, order.id));
      return { success: true };
    }),
});
