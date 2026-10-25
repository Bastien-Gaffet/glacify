import { TRPCError } from "@trpc/server";
import { and, asc, count, eq } from "drizzle-orm";
import { FREE_LIMITS, HARD_LIMITS } from "@contracts/plans";
import { orders, rounds, users, type AppUser, type OrderRow } from "@db/schema";
import { isPremium, planLimit } from "../lib/entitlements";
import { getDb } from "./connection";

export function notFound(what = "Tournée introuvable"): never {
  throw new TRPCError({ code: "NOT_FOUND", message: what });
}

export async function ownedRound(userId: number, id: number) {
  const [round] = await getDb()
    .select()
    .from(rounds)
    .where(and(eq(rounds.id, id), eq(rounds.userId, userId)))
    .limit(1);
  return round ?? notFound();
}

export async function roundByCode(code: string) {
  const [row] = await getDb()
    .select({ round: rounds, host: users })
    .from(rounds)
    .innerJoin(users, eq(users.id, rounds.userId))
    .where(eq(rounds.code, code))
    .limit(1);
  return row ?? notFound("Ce lien de commande n'existe pas ou plus");
}

export async function roundOrders(roundId: number) {
  return getDb().select().from(orders).where(eq(orders.roundId, roundId)).orderBy(asc(orders.createdAt), asc(orders.id));
}

export function orderDto(o: OrderRow) {
  return {
    id: o.id,
    name: o.name,
    containerId: o.containerId,
    scoops: o.scoops,
    toppings: o.toppings,
    note: o.note,
    source: o.source,
    servedAt: o.servedAt,
    createdAt: o.createdAt,
  };
}

/** Throws when the round cannot take one more order (free limit, or the hard ceiling). */
export async function assertOrderRoom(host: AppUser, roundId: number) {
  const [{ n }] = await getDb().select({ n: count() }).from(orders).where(eq(orders.roundId, roundId));
  if (n >= HARD_LIMITS.ordersPerRound)
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette tournée est complète" });
  if (!isPremium(host) && n >= FREE_LIMITS.ordersPerRound) planLimit("orders_per_round");
}

/** Throws when the host may not have one more round taking orders. */
export async function assertOpenRoundRoom(host: AppUser) {
  if (isPremium(host)) return;
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(rounds)
    .where(and(eq(rounds.userId, host.id), eq(rounds.status, "open")));
  if (n >= FREE_LIMITS.openRounds) planLimit("open_rounds");
}
