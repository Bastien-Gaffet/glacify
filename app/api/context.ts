import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { AppUser } from "@db/schema";
import { authenticateRequest } from "./lib/session";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: AppUser;
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch (e) {
    console.error("[auth] session lookup failed", e);
  }
  return ctx;
}
