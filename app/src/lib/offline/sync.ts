import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { createTRPCUntypedClient, httpBatchLink, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";
import type { AppRouter } from "../../../api/router";
import { showError } from "../errors";
import { outbox, swapIds } from "./outbox";
import { applyOffline, canWaitOffline } from "./patches";

/**
 * The bridge between the app and the server when the network comes and goes.
 *
 * - A host's change that cannot reach the server (offline, or the request
 *   fails on the way) shows at once (patches.ts) and waits in the outbox.
 * - Once the network is back the outbox leaves, in order; then everything
 *   is fetched again so the screens show the server's truth.
 * - While changes are waiting, reads wait for them: a refresh never shows
 *   the server's old state over what the host just did.
 */
const RETRY = 15_000;

const client = createTRPCUntypedClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: (input, init) => globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }),
    }),
  ],
});

/** No answer at all (no network, server unreachable), as opposed to a refusal */
function isNetworkError(err: unknown) {
  const e = err as { data?: unknown; shape?: unknown } | null;
  return !e?.data && !e?.shape;
}

let qc: QueryClient | null = null;
// The browser can believe it is online with no network behind (a phone on a
// dead wifi): a request that gets no answer says otherwise
let reachable = true;
const statusListeners = new Set<() => void>();
function setReachable(v: boolean) {
  if (reachable === v) return;
  reachable = v;
  for (const l of statusListeners) l();
}
let flushing: Promise<void> | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;
const idleWaiters: (() => void)[] = [];

function whenIdle() {
  return outbox.size === 0 ? Promise.resolve() : new Promise<void>((r) => idleWaiters.push(r));
}

export function flush(): Promise<void> {
  if (flushing) return flushing;
  clearTimeout(retry);
  flushing = (async () => {
    while (outbox.size) {
      const item = outbox.items[0]!;
      try {
        const res = (await client.mutation(item.path, swapIds(item.input))) as { id?: number } | undefined;
        setReachable(true);
        if (item.tempId !== undefined && typeof res?.id === "number") outbox.resolve(item.tempId, res.id);
        outbox.drop(item.n);
      } catch (err) {
        if (isNetworkError(err)) {
          setReachable(false);
          break;
        }
        setReachable(true);
        // Refused by the server (deleted meanwhile, limit…): said, then let go
        outbox.drop(item.n);
        showError(err as Error);
      }
    }
  })().finally(() => {
    flushing = null;
    if (outbox.size) {
      retry = setTimeout(() => void flush(), RETRY);
      return;
    }
    for (const r of idleWaiters.splice(0)) r();
    void qc?.invalidateQueries();
  });
  return flushing;
}

const kick = () => navigator.onLine && void flush();

/** Placed before the HTTP link: holds the host's changes when the network is away */
export function offlineLink(queryClient: QueryClient): TRPCLink<AppRouter> {
  qc = queryClient;
  window.addEventListener("online", () => (setReachable(true), kick()));
  if (outbox.size) setTimeout(kick, 500);

  return () =>
    ({ op, next }) =>
      observable((observer) => {
        let sub: { unsubscribe: () => void } | undefined;
        let stopped = false;
        const send = (input: unknown, onNetworkError?: () => void) => {
          sub = next({ ...op, input }).subscribe({
            next: (v) => (setReachable(true), observer.next(v)),
            error: (err) => {
              setReachable(!isNetworkError(err));
              if (onNetworkError && isNetworkError(err)) onNetworkError();
              else observer.error(err);
            },
            complete: () => observer.complete(),
          });
        };

        if (op.type !== "mutation") {
          // Reads wait for the changes still on their way
          void whenIdle().then(() => !stopped && send(swapIds(op.input)));
          return () => ((stopped = true), sub?.unsubscribe());
        }

        const input = swapIds(op.input);
        if (!canWaitOffline(op.path)) {
          send(input);
          return () => sub?.unsubscribe();
        }
        const hold = () => {
          const { result, tempId } = applyOffline(queryClient, op.path, input)!;
          outbox.push(op.path, input, tempId);
          observer.next({ result: { type: "data", data: result } });
          observer.complete();
          kick();
        };
        // Changes leave in order: behind the ones already waiting
        if (outbox.size || !navigator.onLine) hold();
        else send(input, hold);
        return () => sub?.unsubscribe();
      });
}

/** Online or not, and how many changes are waiting (for the badge) */
function subscribe(l: () => void) {
  const off = outbox.subscribe(l);
  statusListeners.add(l);
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    off();
    statusListeners.delete(l);
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}
let snap = { online: navigator.onLine, waiting: outbox.size };
function getSnapshot() {
  const online = navigator.onLine && reachable;
  if (snap.online !== online || snap.waiting !== outbox.size) snap = { online, waiting: outbox.size };
  return snap;
}
export const useSyncStatus = () => useSyncExternalStore(subscribe, getSnapshot);
