import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

/** Serves the built client, and index.html for every page route (SPA). */
export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const isFile = /\.[a-z0-9]+$/i.test(c.req.path);
    if (c.req.path.startsWith("/api/") || isFile) return c.json({ error: "Not Found" }, 404);
    return c.html(indexHtml);
  });
}
