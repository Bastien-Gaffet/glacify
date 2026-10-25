import * as jose from "jose";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { users } from "@db/schema";
import { env } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { getDb } from "../queries/connection";

const JWT_ALG = "HS256";
const secret = () => new TextEncoder().encode(env.appSecret);

async function signSessionToken(userId: number, version: number): Promise<string> {
  return new jose.SignJWT({ v: version })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(secret());
}

async function verifySessionToken(token: string): Promise<{ userId: number; version: number } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret(), { algorithms: [JWT_ALG] });
    const userId = Number(payload.sub);
    const version = typeof payload.v === "number" ? payload.v : 0;
    return Number.isSafeInteger(userId) && userId > 0 ? { userId, version } : null;
  } catch {
    return null;
  }
}

export async function findUserById(id: number) {
  return (await getDb().select().from(users).where(eq(users.id, id)).limit(1))[0];
}

/** Returns the user behind the session cookie, or undefined. */
export async function authenticateRequest(headers: Headers) {
  const token = cookie.parse(headers.get("cookie") || "")[Session.cookieName];
  if (!token) return undefined;
  const claim = await verifySessionToken(token);
  if (!claim) return undefined;
  const user = await findUserById(claim.userId);
  // Sessions older than the last "sign out everywhere" are refused
  return user && user.sessionVersion === claim.version ? user : undefined;
}

function serializeSessionCookie(headers: Headers, value: string, maxAge: number) {
  const opts = getSessionCookieOptions(headers);
  return cookie.serialize(Session.cookieName, value, {
    httpOnly: opts.httpOnly,
    path: opts.path,
    sameSite: "lax",
    secure: opts.secure,
    maxAge,
  });
}

type Ctx = { resHeaders: Headers; req: { headers: Headers } };

export async function issueSession(ctx: Ctx, userId: number, version: number) {
  const token = await signSessionToken(userId, version);
  ctx.resHeaders.append("set-cookie", serializeSessionCookie(ctx.req.headers, token, Session.maxAgeMs / 1000));
}

export function clearSession(ctx: Ctx) {
  ctx.resHeaders.append("set-cookie", serializeSessionCookie(ctx.req.headers, "", 0));
}
