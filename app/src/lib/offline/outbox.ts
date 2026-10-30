/**
 * Changes made without a network wait here, on the phone, then leave in the
 * order they were made once the network is back.
 *
 * Something created offline (a round, an order, a flavor) gets a temporary
 * negative id; when the server gives it its real id, every waiting change
 * that names it is rewritten, and so are the pages that show it.
 */
import superjson from "superjson";

export type Pending = {
  n: number;
  path: string;
  input: unknown;
  tempId?: number;
};

const KEY = "glacify-outbox";
const IDS_KEY = "glacify-temp-ids";

type State = { items: Pending[]; next: number; ids: Record<string, number> };

function load(): State {
  try {
    // superjson: the dates inside a change (the reading timer's) stay dates
    const saved = localStorage.getItem(KEY);
    // (a queue saved by an earlier version is plain JSON)
    const raw = (saved ? (superjson.parse(saved) ?? JSON.parse(saved)) : null) as Partial<State> | null;
    const ids = JSON.parse(localStorage.getItem(IDS_KEY) ?? "{}") as Record<string, number>;
    return { items: raw?.items ?? [], next: raw?.next ?? -1, ids };
  } catch {
    return { items: [], next: -1, ids: {} };
  }
}

let state = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, superjson.stringify({ items: state.items, next: state.next }));
    localStorage.setItem(IDS_KEY, JSON.stringify(state.ids));
  } catch {
    /* storage full or unavailable: the changes stay in memory */
  }
  for (const l of listeners) l();
}

export const outbox = {
  get items() {
    return state.items;
  },
  get size() {
    return state.items.length;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  /** A fresh temporary id: negative, never reused */
  tempId() {
    const id = state.next;
    state.next -= 1;
    save();
    return id;
  },
  push(path: string, input: unknown, tempId?: number) {
    const n = (state.items.at(-1)?.n ?? 0) + 1;
    state.items = [...state.items, { n, path, input, tempId }];
    save();
  },
  drop(n: number) {
    state.items = state.items.filter((x) => x.n !== n);
    save();
  },
  /** The server gave `real` to what was `temp`: the waiting changes follow */
  resolve(temp: number, real: number) {
    state.ids = { ...state.ids, [temp]: real };
    state.items = state.items.map((x) => ({ ...x, input: swapIds(x.input) }));
    save();
  },
  /** The real id of something created offline, once known */
  realId(id: number) {
    return id < 0 ? state.ids[id] : id;
  },
  clear() {
    state = { items: [], next: state.next, ids: {} };
    save();
  },
};

/** Every known temporary id inside a change, replaced by the real one */
export function swapIds<T>(value: T): T {
  if (typeof value === "number") return (value < 0 && state.ids[value] !== undefined ? state.ids[value] : value) as T;
  if (Array.isArray(value)) return value.map(swapIds) as T;
  if (value && typeof value === "object" && !(value instanceof Date))
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapIds(v)])) as T;
  return value;
}
