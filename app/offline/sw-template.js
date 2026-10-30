/* Glacify's service worker, written by the build (vite.config.ts, offlineShell):
 * __BUILD__ and __ASSETS__ are filled in there.
 *
 * - The app's shell (index.html, scripts, styles, fonts, icons) is kept on
 *   the phone: the app opens without a network.
 * - Pages: network first (always the latest version when online), the kept
 *   copy when offline.
 * - Hashed assets never change: kept copy first.
 * - The API is never touched here: offline data is the app's business
 *   (src/lib/offline).
 */
const BUILD = "__BUILD__";
const CACHE = `glacify-${BUILD}`;
const ASSETS = __ASSETS__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", ...ASSETS]))
      // A new version takes over at once; the page reloads itself (src/lib/updates.ts)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("glacify-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.endsWith(".apk")) return;

  if (req.mode === "navigate") {
    // Any page of the app is index.html; offline, the kept one
    event.respondWith(
      fetch(req).catch(() => caches.open(CACHE).then((cache) => cache.match("/")).then((res) => res ?? Response.error())),
    );
    return;
  }

  if (url.pathname === "/version.json" || url.pathname === "/sw.js") return;

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok && url.pathname.startsWith("/assets/")) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
