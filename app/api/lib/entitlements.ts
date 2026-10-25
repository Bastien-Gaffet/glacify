import { TRPCError } from "@trpc/server";
import { PLAN_LIMIT_MESSAGES, type PlanLimit } from "@contracts/plans";
import type { AppUser } from "@db/schema";
import { env } from "./env";

export function isPremium(user: Pick<AppUser, "premium">) {
  return env.betaPremium || user.premium === 1;
}

/** Free limit reached: the message says which one, the app offers Premium. */
export function planLimit(limit: PlanLimit): never {
  throw new TRPCError({ code: "FORBIDDEN", message: PLAN_LIMIT_MESSAGES[limit], cause: { plan: limit } });
}
