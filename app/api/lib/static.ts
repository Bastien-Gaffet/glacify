import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

// index.html, the service worker and the version must never be kept stale:
// without this the Android app's web view showed an old version until its
// cache was cleared. Hashed assets never change: kept a year.
const NO_CACHE = "no-cache";
const FOREVER = "public, max-age=31536000, immutable";

/** Serves the built client, and index.html for every page route (SPA). */
export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.use("*", async (c, next) => {
    await next();
    const p = c.req.path;
    if (p.startsWith("/api/")) return;
    if (p.startsWith("/assets/") && c.res.status === 200) c.header("Cache-Control", FOREVER);
    else if (!c.res.headers.get("Cache-Control")) c.header("Cache-Control", NO_CACHE);
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const isFile = /\.[a-z0-9]+$/i.test(c.req.path);
    if (c.req.path.startsWith("/api/") || isFile) return c.json({ error: "Not Found" }, 404);
    return c.html(indexHtml);
  });
}
