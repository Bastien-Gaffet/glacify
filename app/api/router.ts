import { authRouter } from "./auth-router";
import { guestRouter } from "./guest-router";
import { menuRouter } from "./menu-router";
import { roundsRouter } from "./rounds-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  rounds: roundsRouter,
  guest: guestRouter,
});

export type AppRouter = typeof appRouter;
