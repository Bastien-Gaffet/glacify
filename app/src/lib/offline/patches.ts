import type { QueryClient } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";
import { outbox } from "./outbox";

/**
 * What a change made offline does to the screens right away, and the answer
 * the server would have given. The real answer comes with the sync: every
 * query is then fetched again.
 *
 * Only the host's changes are here; signing in, a guest's order or putting
 * back the classic carte need the server.
 */
type In = inferRouterInputs<AppRouter>;
type Out = inferRouterOutputs<AppRouter>;
type RoundData = Out["rounds"]["get"];
type RoundList = Out["rounds"]["list"];
type Menu = Out["menu"]["get"];
type Order = RoundData["orders"][number];

// tRPC's query keys: [path, { input, type }]
const key = (path: string, input?: unknown) => [path.split("."), input === undefined ? { type: "query" } : { input, type: "query" }];

function update<T>(qc: QueryClient, path: string, input: unknown, fn: (old: T) => T) {
  qc.setQueryData<T>(key(path, input), (old) => (old === undefined ? old : fn(old)));
}

/** Every cached round, whatever its id */
function eachRound(qc: QueryClient, fn: (old: RoundData) => RoundData) {
  for (const [k, data] of qc.getQueriesData<RoundData>({
    queryKey: [["rounds", "get"]],
  }))
    if (data) qc.setQueryData(k, fn(data));
}

function eachMenu(qc: QueryClient, fn: (m: Menu) => Menu) {
  update<Menu>(qc, "menu.get", undefined, fn);
  eachRound(qc, (r) => ({ ...r, menu: fn(r.menu) }));
}

function listCounts(qc: QueryClient, roundId: number) {
  const r = qc.getQueryData<RoundData>(key("rounds.get", { id: roundId }));
  if (!r) return;
  update<RoundList>(qc, "rounds.list", undefined, (list) =>
    list.map((x) =>
      x.id === roundId
        ? {
            ...x,
            orders: r.orders.length,
            served: r.orders.filter((o) => o.servedAt).length,
            scoops: r.orders.reduce((n, o) => n + o.scoops.length, 0),
          }
        : x,
    ),
  );
}

type Patch = (qc: QueryClient, input: never) => { result: unknown; tempId?: number };

const ok = { result: { success: true } };

const patches: Record<string, Patch> = {
  "rounds.create": (qc, input: In["rounds"]["create"]) => {
    const id = outbox.tempId();
    const createdAt = new Date();
    update<RoundList>(qc, "rounds.list", undefined, (list) => [
      {
        id,
        title: input.title,
        code: "",
        status: "open" as const,
        createdAt,
        orders: 0,
        served: 0,
        scoops: 0,
      },
      ...list,
    ]);
    const menu = qc.getQueryData<Menu>(key("menu.get"));
    if (menu)
      qc.setQueryData<RoundData>(key("rounds.get", { id }), {
        round: {
          id,
          title: input.title,
          code: "",
          status: "open",
          checks: [],
          createdAt,
        },
        orders: [],
        menu,
        limits: { premium: false, ordersPerRound: null },
      });
    return { result: { id }, tempId: id };
  },
  "rounds.rename": (qc, input: In["rounds"]["rename"]) => {
    update<RoundData>(qc, "rounds.get", { id: input.id }, (r) => ({
      ...r,
      round: { ...r.round, title: input.title },
    }));
    update<RoundList>(qc, "rounds.list", undefined, (l) => l.map((x) => (x.id === input.id ? { ...x, title: input.title } : x)));
    return ok;
  },
  "rounds.setStatus": (qc, input: In["rounds"]["setStatus"]) => {
    update<RoundData>(qc, "rounds.get", { id: input.id }, (r) => ({
      ...r,
      round: { ...r.round, status: input.status },
    }));
    update<RoundList>(qc, "rounds.list", undefined, (l) => l.map((x) => (x.id === input.id ? { ...x, status: input.status } : x)));
    return ok;
  },
  "rounds.remove": (qc, input: In["rounds"]["remove"]) => {
    update<RoundList>(qc, "rounds.list", undefined, (l) => l.filter((x) => x.id !== input.id));
    qc.removeQueries({ queryKey: key("rounds.get", { id: input.id }) });
    return ok;
  },
  "rounds.setCheck": (qc, input: In["rounds"]["setCheck"]) => {
    update<RoundData>(qc, "rounds.get", { id: input.id }, (r) => {
      const checks = new Set(r.round.checks);
      for (const k of input.keys)
        if (input.done) checks.add(k);
        else checks.delete(k);
      return { ...r, round: { ...r.round, checks: [...checks] } };
    });
    return ok;
  },
  "rounds.resetService": (qc, input: In["rounds"]["resetService"]) => {
    update<RoundData>(qc, "rounds.get", { id: input.id }, (r) => ({
      ...r,
      round: { ...r.round, checks: [] },
      orders: r.orders.map((o) => ({ ...o, servedAt: null })),
    }));
    listCounts(qc, input.id);
    return ok;
  },
  "rounds.saveOrder": (qc, input: In["rounds"]["saveOrder"]) => {
    const { roundId, id: orderId, ...fields } = input;
    const id = orderId ?? outbox.tempId();
    update<RoundData>(qc, "rounds.get", { id: roundId }, (r) => {
      const values = {
        ...fields,
        toppings: fields.toppings ?? [],
        note: fields.note || null,
      };
      const orders: Order[] = orderId
        ? r.orders.map((o) => (o.id === orderId ? { ...o, ...values } : o))
        : [
            ...r.orders,
            {
              id,
              ...values,
              source: "host",
              servedAt: null,
              createdAt: new Date(),
            } as Order,
          ];
      return { ...r, orders };
    });
    listCounts(qc, roundId);
    return { result: { id }, tempId: orderId ? undefined : id };
  },
  "rounds.removeOrder": (qc, input: In["rounds"]["removeOrder"]) => {
    eachRound(qc, (r) => (r.orders.some((o) => o.id === input.id) ? { ...r, orders: r.orders.filter((o) => o.id !== input.id) } : r));
    for (const [, r] of qc.getQueriesData<RoundData>({
      queryKey: [["rounds", "get"]],
    }))
      if (r) listCounts(qc, r.round.id);
    return ok;
  },
  "rounds.setServed": (qc, input: In["rounds"]["setServed"]) => {
    const servedAt = input.served ? new Date() : null;
    eachRound(qc, (r) =>
      r.orders.some((o) => o.id === input.id)
        ? {
            ...r,
            orders: r.orders.map((o) => (o.id === input.id ? { ...o, servedAt } : o)),
          }
        : r,
    );
    for (const [, r] of qc.getQueriesData<RoundData>({
      queryKey: [["rounds", "get"]],
    }))
      if (r) listCounts(qc, r.round.id);
    return ok;
  },
  "menu.setAvailable": (qc, input: In["menu"]["setAvailable"]) => {
    eachMenu(qc, (m) => ({
      ...m,
      [input.kind]: (m[input.kind] as { id: number }[]).map((x) => (x.id === input.id ? { ...x, available: input.available } : x)),
    }));
    return ok;
  },
  "menu.remove": (qc, input: In["menu"]["remove"]) => {
    eachMenu(qc, (m) => ({
      ...m,
      [input.kind]: (m[input.kind] as { id: number }[]).map((x) => (x.id === input.id ? { ...x, archived: true } : x)),
    }));
    return ok;
  },
  "menu.reorder": (qc, input: In["menu"]["reorder"]) => {
    eachMenu(qc, (m) => {
      const rank = new Map(input.ids.map((id, i) => [id, i]));
      const list = [...(m[input.kind] as { id: number }[])].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
      return { ...m, [input.kind]: list };
    });
    return ok;
  },
  "menu.saveFlavor": (qc, input: In["menu"]["saveFlavor"]) => saveItem(qc, "flavors", input),
  "menu.saveTopping": (qc, input: In["menu"]["saveTopping"]) => saveItem(qc, "toppings", input),
  "menu.saveContainer": (qc, input: In["menu"]["saveContainer"]) => saveItem(qc, "containers", input),
};

function saveItem(qc: QueryClient, kind: keyof Menu, input: { id?: number } & Record<string, unknown>) {
  const id = input.id ?? outbox.tempId();
  const fields = {
    ...input,
    id,
    archived: false,
    available: input.available ?? true,
  };
  eachMenu(qc, (m) => {
    const list = m[kind] as { id: number }[];
    return {
      ...m,
      [kind]: input.id ? list.map((x) => (x.id === id ? { ...x, ...fields } : x)) : [...list, fields],
    };
  });
  return { result: { id }, tempId: input.id ? undefined : id };
}

/** The change's effect on the screens and its answer, or null when it needs the server */
export function applyOffline(qc: QueryClient, path: string, input: unknown) {
  const patch = patches[path];
  return patch ? patch(qc, input as never) : null;
}

export const canWaitOffline = (path: string) => path in patches;
