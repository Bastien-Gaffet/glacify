import { initTRPC } from "@trpc/server";
import { fail } from "./lib/fail";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    fail("UNAUTHORIZED", "unauthenticated");
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const authedQuery = t.procedure.use(requireAuth);
