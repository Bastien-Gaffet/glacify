import { toast } from "sonner";
import { i18n } from "./i18n";

/**
 * Keeps the app up to date, in the browser as in the Android app.
 *
 * The service worker (offline/sw-template.js) keeps the app on the phone so
 * that it opens offline. Each deploy writes a new /version.json: when the app
 * comes back to the foreground (and every 15 minutes) it compares it with its
 * own build; if it differs, the new service worker is fetched, takes over,
 * and the page reloads itself. Coming back to the app, that happens at once;
 * while it is in use, a toast offers the reload instead of cutting in.
 */
const EVERY = 15 * 60 * 1000;

let reloadNow = true;

async function check(reg: ServiceWorkerRegistration | null) {
  if (!navigator.onLine) return;
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build?: string };
    if (!build || build === __BUILD__) return;
    if (reg) await reg.update();
    else location.reload();
  } catch {
    /* offline or server busy: next time */
  }
}

export function watchUpdates() {
  if (import.meta.env.DEV) return;
  const sw = "serviceWorker" in navigator ? navigator.serviceWorker : null;
  let reg: ServiceWorkerRegistration | null = null;

  if (sw) {
    // The very first install takes control too: that is not an update
    const hadController = !!sw.controller;
    let reloading = false;
    sw.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      if (reloadNow) {
        reloading = true;
        location.reload();
      } else {
        toast(i18n().t("updateReady"), { duration: Infinity, action: { label: i18n().t("updateNow"), onClick: () => location.reload() } });
      }
    });
    sw.register("/sw.js")
      .then((r) => {
        reg = r;
        return check(r);
      })
      .catch(() => {});
  } else {
    void check(null);
  }

  // Back to the app: the moment to update without disturbing anyone
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    reloadNow = true;
    void check(reg).finally(() => setTimeout(() => (reloadNow = false), 4000));
  });
  setTimeout(() => (reloadNow = false), 6000);
  setInterval(() => document.visibilityState === "visible" && void check(reg), EVERY);
}
