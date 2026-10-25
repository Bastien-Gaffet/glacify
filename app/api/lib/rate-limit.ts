import { TRPCError } from "@trpc/server";

/**
 * In-memory sliding-window limiter (single process, which is how Glacify runs).
 * Counters vanish on restart, which is fine for brute-force protection.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Throws TOO_MANY_REQUESTS when any of the keys is over its limit. */
export function rateLimit(rules: { key: string; limit: number; windowMs: number }[]) {
  for (const r of rules) {
    if (!allow(r.key, r.limit, r.windowMs))
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts" });
  }
}

/** Client IP as set by nginx (never trust it without the proxy in front). */
export function clientIp(headers: Headers) {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// Drop stale counters now and then so memory stays flat
setInterval(() => {
  const now = Date.now();
  for (const [key, list] of hits) {
    if (list.every((t) => now - t > 60 * 60 * 1000)) hits.delete(key);
  }
}, 10 * 60 * 1000).unref();

export const MINUTE = 60 * 1000;

/**
 * Per-address rule. Behind the VPS's port-443 multiplexer every visitor arrives
 * as 127.0.0.1, so a per-IP limit would in fact be shared by everyone (30 bad
 * passwords would lock all users out). Until real addresses reach the app, the
 * shared address gets a ceiling 20 times higher: an anti-flood guard only. The
 * real protections are per account (login) and per code (two-step).
 */
const SHARED = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "unknown"]);
export function perIp(prefix: string, headers: Headers, limit: number, windowMs: number) {
  const ip = clientIp(headers);
  const shared = SHARED.has(ip);
  return { key: `${prefix}:${ip}`, limit: shared ? limit * 20 : limit, windowMs };
}
