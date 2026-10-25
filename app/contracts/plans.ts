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

/** Sent in the tRPC error message when a free limit is hit. */
export type PlanLimit = "open_rounds" | "orders_per_round";

export const PLAN_LIMIT_MESSAGES: Record<PlanLimit, string> = {
  open_rounds: "Une seule tournée ouverte à la fois en version gratuite.",
  orders_per_round: `${FREE_LIMITS.ordersPerRound} glaces par tournée en version gratuite.`,
};
