import { PLAN_LIMIT_ERRORS, type PlanLimit } from "@contracts/plans";
import { fail } from "./fail";
import type { AppUser } from "@db/schema";
import { env } from "./env";

export function isPremium(user: Pick<AppUser, "premium">) {
  return env.betaPremium || user.premium === 1;
}

/** Free limit reached: the message says which one, the app offers Premium. */
export function planLimit(limit: PlanLimit): never {
  fail("FORBIDDEN", PLAN_LIMIT_ERRORS[limit]);
}
