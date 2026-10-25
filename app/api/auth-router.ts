import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { users } from "@db/schema";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { clearSession, issueSession } from "./lib/session";
import { hashPassword, verifyPassword } from "./lib/password";
import { MINUTE, perIp, rateLimit } from "./lib/rate-limit";
import { isPremium } from "./lib/entitlements";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { seedMenu } from "./queries/menu";

const email = z.string().trim().toLowerCase().email().max(320);

export const authRouter = createRouter({
  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    // Sliding session: each visit renews the cookie for a year, so a session
    // without an account (only held by this cookie) never expires while in use
    await issueSession(ctx, ctx.user.id, ctx.user.sessionVersion);
    const { passwordHash: _pw, sessionVersion: _sv, ...user } = ctx.user;
    return {
      ...user,
      anonymous: !!user.anonymous,
      email: user.anonymous ? null : user.email,
      premium: isPremium(user),
      beta: env.betaPremium,
    };
  }),

  /** Use the app straight away: a real session on this device, no e-mail or password. */
  startGuest: publicQuery
    .input(z.object({ name: z.string().trim().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user) return { success: true };
      rateLimit([perIp("guest", ctx.req.headers, 10, 60 * MINUTE)]);
      const [res] = await getDb()
        .insert(users)
        .values({
          email: `visitor-${randomBytes(24).toString("hex")}@session.invalid`,
          name: input.name || "Glacier",
          passwordHash: "",
          anonymous: 1,
        });
      await seedMenu(res.insertId);
      await issueSession(ctx, res.insertId, 0);
      return { success: true };
    }),

  /** A new account; from a session without one, the same user (carte and rounds) gets the account. */
  register: publicQuery
    .input(z.object({ email, password: z.string().min(8).max(128), name: z.string().trim().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      if (!env.registrationOpen) throw new TRPCError({ code: "FORBIDDEN", message: "Inscriptions fermées" });
      rateLimit([perIp("register", ctx.req.headers, 5, 60 * MINUTE)]);
      const db = getDb();
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cet e-mail" });
      const account = { email: input.email, name: input.name, passwordHash: hashPassword(input.password) };
      if (ctx.user?.anonymous) {
        const version = ctx.user.sessionVersion + 1;
        const [res] = await db
          .update(users)
          .set({ ...account, anonymous: 0, sessionVersion: version })
          .where(and(eq(users.id, ctx.user.id), eq(users.anonymous, 1)));
        if (!res.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Session déjà convertie" });
        await issueSession(ctx, ctx.user.id, version);
        return { success: true };
      }
      const [res] = await db.insert(users).values(account);
      await seedMenu(res.insertId);
      await issueSession(ctx, res.insertId, 0);
      return { success: true };
    }),

  login: publicQuery
    .input(z.object({ email, password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      rateLimit([
        perIp("login", ctx.req.headers, 20, 15 * MINUTE),
        { key: `login:${input.email}`, limit: 10, windowMs: 15 * MINUTE },
      ]);
      const user = (await getDb().select().from(users).where(eq(users.email, input.email)).limit(1))[0];
      if (!user || user.anonymous || !verifyPassword(input.password, user.passwordHash))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou mot de passe incorrect" });
      await issueSession(ctx, user.id, user.sessionVersion);
      return { success: true };
    }),

  logout: publicQuery.mutation(({ ctx }) => {
    clearSession(ctx);
    return { success: true };
  }),

  /** Invalidates every session, this one included, then signs this device back in. */
  logoutEverywhere: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, ctx.user.id));
    await issueSession(ctx, ctx.user.id, ctx.user.sessionVersion + 1);
    return { success: true };
  }),

  updateProfile: authedQuery
    .input(z.object({ name: z.string().trim().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(users).set(input).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  changePassword: authedQuery
    .input(z.object({ currentPassword: z.string().max(128), newPassword: z.string().min(8).max(128) }))
    .mutation(async ({ ctx, input }) => {
      rateLimit([{ key: `pw:${ctx.user.id}`, limit: 5, windowMs: 15 * MINUTE }]);
      if (!verifyPassword(input.currentPassword, ctx.user.passwordHash))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Mot de passe actuel incorrect" });
      await getDb()
        .update(users)
        .set({ passwordHash: hashPassword(input.newPassword), sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, ctx.user.id));
      await issueSession(ctx, ctx.user.id, ctx.user.sessionVersion + 1);
      return { success: true };
    }),
});
