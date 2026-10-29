import type { AppError } from "./errors";

/**
 * Limits of a possible free tier, kept for later. Glacify is free during the
 * beta: they apply only if the server runs with BETA_PREMIUM=false.
 */
export const FREE_LIMITS = {
  /** Rounds taking orders at the same time */
  openRounds: 1,
  ordersPerRound: 12,
} as const;

/** Hard ceilings, Premium included: keep a shared link from being flooded. */
export const HARD_LIMITS = {
  ordersPerRound: 150,
  /** Ice creams one guest link may order (children, a partner...) */
  ordersPerGuest: 8,
  flavors: 80,
  toppings: 40,
  containers: 12,
} as const;

export type PlanLimit = "open_rounds" | "orders_per_round";

/** The error sent when a free limit is hit. */
export const PLAN_LIMIT_ERRORS: Record<PlanLimit, AppError> = {
  open_rounds: { code: "plan.openRounds", params: { n: FREE_LIMITS.openRounds } },
  orders_per_round: { code: "plan.ordersPerRound", params: { n: FREE_LIMITS.ordersPerRound } },
};
