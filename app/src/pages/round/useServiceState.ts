import { useMemo, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { showError } from "@/lib/errors";
import type { RoundData } from "./types";

type Op = { kind: "check"; keys: string[]; done: boolean } | { kind: "serve"; orderId: number; served: boolean };

/**
 * Ticks and "served" marks of the service. They show at once, are sent to
 * the server one after the other (quick taps never overtake each other), and
 * stay layered over the polled data until the server has them, so a refresh
 * in between never makes a tick flicker.
 */
export function useServiceState(data: RoundData) {
  const { round } = data;
  const utils = trpc.useUtils();
  const setCheck = trpc.rounds.setCheck.useMutation();
  const setServed = trpc.rounds.setServed.useMutation();
  const [pending, setPending] = useState<Op[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const checks = useMemo(() => {
    const set = new Set(round.checks);
    for (const op of pending) if (op.kind === "check") for (const k of op.keys) op.done ? set.add(k) : set.delete(k);
    return set;
  }, [round.checks, pending]);

  const served = useMemo(() => {
    const map = new Map(data.orders.map((o) => [o.id, !!o.servedAt]));
    for (const op of pending) if (op.kind === "serve") map.set(op.orderId, op.served);
    return map;
  }, [data.orders, pending]);

  const run = (op: Op) => {
    setPending((p) => [...p, op]);
    queue.current = queue.current
      .then(() =>
        op.kind === "check"
          ? setCheck.mutateAsync({ id: round.id, keys: op.keys, done: op.done })
          : setServed.mutateAsync({ id: op.orderId, served: op.served }),
      )
      .catch(showError)
      .then(() => utils.rounds.get.invalidate({ id: round.id }))
      .finally(() => setPending((p) => p.filter((x) => x !== op)));
  };

  return {
    checks,
    isServed: (orderId: number) => served.get(orderId) ?? false,
    setChecks: (keys: string[], done: boolean) => keys.length > 0 && run({ kind: "check", keys, done }),
    serve: (orderId: number, isServed: boolean) => run({ kind: "serve", orderId, served: isServed }),
  };
}

export type ServiceState = ReturnType<typeof useServiceState>;
