import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { clsx } from "clsx";
import { buildPlan } from "@contracts/plan";
import { IceCream } from "@/components/IceCream";
import { PatternMarks, PatternOverlay } from "@/components/FlavorPattern";
import type { ScoopLook } from "@contracts/menu";
import { describeOrder, lookup, plural } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { usePop } from "@/lib/style";
import { groupLabel, serviceSteps, stepDone, tileDone, type ServiceStep } from "./serviceSteps";
import type { ServiceState } from "./useServiceState";
import type { RoundData, RoundOrder } from "./types";

/** A short buzz on phones that can, nothing elsewhere */
const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not allowed here */
  }
};

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0.4 }),
};

/** Bits of colour bursting out of the middle */
function Confetti({ colors, count = 18 }: { colors: string[]; count?: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 90 + ((i * 37) % 70);
        const size = 7 + ((i * 13) % 7);
        return (
          <motion.span
            key={i}
            className={clsx("absolute", i % 3 === 0 ? "rounded-[3px]" : "rounded-full")}
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 30, opacity: 0, scale: 1, rotate: 180 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

/** The tub goes back in the freezer: its lid drops on, a burst of colour */
function FreezerParty({ look, label }: { look: ScoopLook; label: string }) {
  const { color } = look;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center bg-canvas/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative h-32 w-36">
        <Confetti colors={[color, "rgb(var(--accent))", color, "rgb(var(--pistache))"]} />
        <motion.div
          className="absolute inset-x-2 bottom-0 top-7 overflow-hidden rounded-b-[26px] rounded-t-lg bg-canvas shadow-[inset_0_0_0_3px_rgb(var(--line))]"
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
        >
          <div className="absolute inset-x-[3px] bottom-[3px] top-3 overflow-hidden rounded-b-[23px] rounded-t-[14px]" style={{ background: color }}>
            <PatternOverlay look={look} />
          </div>
        </motion.div>
        <motion.div
          className="absolute inset-x-0 top-0 h-9 rounded-2xl bg-ink"
          initial={{ y: -90, opacity: 0, rotate: -8 }}
          animate={{ y: 6, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 520, damping: 20 }}
        />
      </div>
      <motion.p
        className="mt-8 font-display text-[30px] font-bold"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.18 }}
      >
        {label}
      </motion.p>
    </motion.div>
  );
}

/** The open tub, drawn like a sticker: the flavor heaped over a white tub */
function TubArt({ look }: { look: ScoopLook }) {
  const clip = useId();
  return (
    <motion.svg
      viewBox="0 0 120 100"
      width="104"
      height="87"
      aria-hidden="true"
      className="flex-none"
      initial={{ scale: 0.5, rotate: -24 }}
      animate={{ scale: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
    >
      <clipPath id={clip}>
        <path d="M14 42 Q60 4 106 42 Z" />
      </clipPath>
      {/* A white edge, like a sticker: the tub stands out on any flavor */}
      <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="10" strokeLinejoin="round">
        <path d="M14 42 Q60 4 106 42 Z" />
        <rect x="10" y="40" width="100" height="54" rx="12" />
      </g>
      <path d="M14 42 Q60 4 106 42 Z" fill={look.color} />
      <g clipPath={`url(#${clip})`}>
        <g transform="translate(10 4) scale(1)">
          <PatternMarks pattern={look.pattern} accent={look.accent} />
        </g>
      </g>
      <path d="M14 42 Q60 4 106 42 Z" fill="none" stroke="rgb(var(--ink))" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="10" y="40" width="100" height="54" rx="12" fill="#FFFFFF" stroke="rgb(var(--ink))" strokeWidth="3.5" />
      <rect x="11.75" y="54" width="96.5" height="9" fill="rgb(var(--accent))" />
    </motion.svg>
  );
}

/** The flavor's pattern spread over the whole screen, marks at a readable size */
function PatternField({ look }: { look: ScoopLook }) {
  const id = useId();
  if (look.pattern === "none") return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="150" height="150" patternUnits="userSpaceOnUse">
          <g transform="scale(1.5)">
            <PatternMarks pattern={look.pattern} accent={look.accent} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.85" />
    </svg>
  );
}

/** Ink or white, whichever reads better on this colour */
function inkOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "rgb(var(--ink))" : "#FFFFFF";
}

function Heading({ eyebrow, title, sub, lead }: { eyebrow: string; title: ReactNode; sub?: ReactNode; lead?: ReactNode }) {
  if (usePop())
    return (
      <div className="px-1.5">
        <div className="flex items-center gap-3.5">
          {lead}
          <div className="min-w-0">
            <span className="inline-block rounded-full border-[2.5px] border-ink bg-accent px-3 py-0.5 font-display text-[14px] font-semibold text-onaccent">
              {eyebrow}
            </span>
            {lead && sub && <p className="mt-2 text-[17px] font-extrabold leading-tight">{sub}</p>}
          </div>
        </div>
        <h2 className="mt-3 break-words font-display text-[44px] font-bold leading-[0.95]">{title}</h2>
        {!lead && sub && <p className="mt-2 text-[17px] font-extrabold leading-tight">{sub}</p>}
      </div>
    );
  return (
    <div className="mb-6 flex items-center gap-4">
      {lead}
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="title mt-1 text-[30px]">{title}</h2>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

/** A big tappable tile: one person (or one kind of container) */
function Tile({
  done,
  onTap,
  children,
  label,
  tilt = 0,
}: {
  done: boolean;
  onTap: () => void;
  children: ReactNode;
  label: string;
  /** Pop look: a ticked tile leans this many degrees */
  tilt?: number;
}) {
  const pop = usePop();
  return (
    <motion.button
      layout
      onClick={onTap}
      aria-pressed={done}
      aria-label={label}
      whileTap={{ scale: 0.94 }}
      animate={{ rotate: pop && done ? tilt : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={clsx(
        "relative flex min-h-[112px] flex-col items-center justify-end gap-1.5 px-2 pb-3 pt-4 text-center transition-colors",
        pop ? "rounded-[22px] border-[3px] border-ink" : "rounded-3xl",
        done ? (pop ? "bg-mint" : "bg-pistache/15") : pop ? "bg-canvas" : "bg-surface",
      )}
    >
      <AnimatePresence>
        {done && (
          <motion.span
            className={clsx(
              "absolute flex items-center justify-center rounded-full bg-pistache text-white",
              pop ? "-right-2 -top-2.5 h-7 w-7 border-[2.5px] border-ink" : "right-2.5 top-2.5 h-7 w-7",
            )}
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
          >
            <Check size={16} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

/**
 * The service as a series of full-screen steps: get the containers out, one
 * screen per tub (tap a person to put their scoop in, or put the tub back in
 * the freezer in one go), the toppings, then hand the ice creams over.
 */
export function ServiceMode({
  data,
  state,
  onExit,
  onCloseRound,
}: {
  data: RoundData;
  state: ServiceState;
  onExit: () => void;
  onCloseRound: () => void;
}) {
  // `t` names the tiles here: the translator is `L`
  const L = useI18n();
  const pop = usePop();
  const { menu, round } = data;
  const l = lookup(menu);
  const plan = buildPlan(data.orders, menu, L.t("removedFlavor"));
  const steps = serviceSteps(plan);
  const isDone = (s: ServiceStep) => stepDone(s, state, plan);
  const firstUndone = () => {
    const i = steps.findIndex((s) => !isDone(s));
    return i < 0 ? steps.length : i;
  };
  const reduced = useReducedMotion();

  const [currentId, setCurrentId] = useState<string>(() => steps[firstUndone()]?.id ?? "end");
  const [dir, setDir] = useState(1);
  const [party, setParty] = useState<{ look: ScoopLook; label: string; n: number } | null>(null);

  // Follow the step by id: a late order may add or remove a tub before it
  let index = currentId === "end" ? steps.length : steps.findIndex((s) => s.id === currentId);
  if (index < 0) index = firstUndone();
  const step = steps[index];

  const go = (i: number, d: number) => {
    setDir(d);
    setCurrentId(steps[i]?.id ?? "end");
  };
  /** The next step still to do after this one, then the end */
  const next = () => {
    const order = [...steps.keys()].slice(index + 1).concat([...steps.keys()].slice(0, index));
    const k = order.find((i) => !isDone(steps[i]!));
    go(k ?? steps.length, 1);
  };
  const nextRef = useRef(next);
  nextRef.current = next;

  const celebrate = (look: ScoopLook, label: string) => {
    buzz(30);
    setParty({ look, label, n: Date.now() });
    setTimeout(
      () => {
        setParty(null);
        nextRef.current();
      },
      reduced ? 350 : 950,
    );
  };

  // The page underneath stays put
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  // Late orders are announced; their tub comes back among the steps to do
  const seen = useRef(new Set(data.orders.map((o) => o.id)));
  useEffect(() => {
    for (const o of data.orders) {
      if (seen.current.has(o.id)) continue;
      seen.current.add(o.id);
      toast(L.t("justOrdered", { name: o.name }), { description: describeOrder(menu, o) });
    }
  }, [data.orders, menu]);

  const tubColors = (o: RoundOrder, tubIndex: number, withTub: boolean) => {
    const rank = new Map(plan.tubs.map((t, i) => [t.flavorId, i]));
    return plan
      .placed(o)
      .filter((f) => rank.get(f)! < tubIndex || (withTub && rank.get(f) === tubIndex))
      .map((f) => l.flavor(f));
  };

  // Heading and tiles apart: in the pop look the tiles sit on a white card
  let head: ReactNode = null;
  let content: ReactNode;
  let primary: { label: string; onClick?: () => void } | null = null;

  if (!step) {
    const left = steps.filter((s) => !isDone(s)).length;
    const colors = plan.totals.map((t) => t.flavor.color);
    content = (
      <div className="flex min-h-full flex-col items-center justify-center text-center">
        <div className="relative mb-8 flex items-end gap-1">
          {left === 0 && <Confetti colors={colors.length ? colors : ["rgb(var(--accent))"]} count={28} />}
          {plan.orders.slice(0, 5).map((o, i) => (
            <motion.div key={o.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 400, damping: 20 }}>
              <IceCream kind={l.container(o.containerId).kind} colors={plan.placed(o).map((f) => l.flavor(f))} size={i === 2 ? 64 : 50} />
            </motion.div>
          ))}
        </div>
        {left === 0 ? (
          <>
            <h2 className="title">{L.t("enjoy")}</h2>
            <p className="mt-2 text-[15px] text-muted">{L.t("allIcesServed")}</p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
              {round.status === "open" && (
                <button className="btn-ink" onClick={onCloseRound}>
                  {L.t("closeRound")}
                </button>
              )}
              <button className="btn-soft" onClick={onExit}>
                {L.t("seeRecap")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="title">{L.t("almostDone")}</h2>
            <p className="mt-2 text-[15px] text-muted">{L.tn("stepsLeft", left)}</p>
            <button className="btn-ink mt-8" onClick={() => go(firstUndone(), -1)}>
              {L.t("goBack")}
            </button>
          </>
        )}
      </div>
    );
  } else if (step.kind === "containers") {
    const total = step.items.reduce((n, i) => n + i.count, 0);
    head = <Heading eyebrow={L.t("firstStep")} title={L.t("getOut")} sub={L.tn("icesToMake", total)} />;
    content = (
      <>
        <div className="grid grid-cols-2 gap-3">
          {step.items.map((i, k) => {
            const done = state.checks.has(i.key);
            return (
              <Tile
                key={i.key}
                done={done}
                tilt={k % 2 ? 2 : -2}
                label={plural(i.count, i.container.name.toLowerCase())}
                onTap={() => (buzz(), state.setChecks([i.key], !done))}
              >
                <IceCream kind={i.container.kind} colors={[]} size={46} />
                <span className="tabular font-display text-[34px] font-bold leading-none">{i.count}</span>
                <span className="text-sm font-medium text-muted">{plural(i.count, i.container.name.toLowerCase()).replace(/^\d+ /, "")}</span>
              </Tile>
            );
          })}
        </div>
      </>
    );
    primary = {
      label: L.t("ready"),
      onClick: () => {
        state.setChecks(
          step.items.map((i) => i.key),
          true,
        );
        next();
      },
    };
  } else if (step.kind === "tub") {
    const { tub } = step;
    const placed = step.tiles.filter((t) => tileDone(state, step.key, t.key)).reduce((n, t) => n + t.count, 0);
    const tap = (t: (typeof step.tiles)[number]) => {
      buzz();
      if (tileDone(state, step.key, t.key)) {
        // Undo one scoop of a tub put away in one go: the others stay ticked
        if (state.checks.has(step.key))
          state.setChecks(
            step.tiles.filter((x) => x !== t).map((x) => x.key),
            true,
          );
        state.setChecks([step.key, t.key], false);
        return;
      }
      const last = step.tiles.every((x) => x === t || state.checks.has(x.key));
      state.setChecks(last ? [t.key, step.key] : [t.key], true);
      if (last) celebrate(tub.flavor, L.t("toFreezer"));
    };
    head = pop ? (
      <Heading
        eyebrow={L.t("tubOf", { i: step.index + 1, n: plan.tubs.length })}
        title={tub.flavor.name}
        sub={
          <>
            {L.tn("scoops", tub.scoops)}
            <br />
            {placed < tub.scoops ? `${L.tn("placed", placed)}, ${L.t("stillN", { n: tub.scoops - placed })}` : L.tn("placed", placed)}
          </>
        }
        lead={<TubArt key={tub.flavorId} look={tub.flavor} />}
      />
    ) : (
        <Heading
          eyebrow={L.t("tubOf", { i: step.index + 1, n: plan.tubs.length })}
          title={tub.flavor.name}
          sub={`${L.tn("scoops", tub.scoops)} · ${L.tn("placed", placed)}`}
          lead={
            <motion.span
              key={tub.flavorId}
              className="relative h-[72px] w-[72px] flex-none overflow-hidden rounded-full shadow-[inset_0_-6px_0_rgb(0_0_0/0.08),inset_0_0_0_1px_rgb(0_0_0/0.06)]"
              style={{ background: tub.flavor.color }}
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
            >
              <PatternOverlay look={tub.flavor} />
            </motion.span>
          }
        />
    );
    content = (
      <>
        {!pop && <p className="-mt-3 mb-5 text-[15px]">{L.t("openTub")}</p>}
        <div className="space-y-6">
          {tub.groups.map((g, gi) => (
            <section key={gi}>
              <h3 className="mb-2.5 font-semibold pop:font-display pop:text-[18px]">{groupLabel(g, menu)}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {g.people.map(({ order, count }, k) => {
                  const t = step.tiles.find((x) => x.order.id === order.id)!;
                  const done = tileDone(state, step.key, t.key);
                  return (
                    <Tile key={t.key} done={done} tilt={k % 2 ? 2 : -2} onTap={() => tap(t)} label={count > 1 ? `${order.name}, ${L.tn("scoops", count)}` : order.name}>
                      <IceCream
                        kind={l.container(order.containerId).kind}
                        colors={tubColors(order, step.index, done)}
                        size={40}
                        animateLast={done}
                      />
                      <span className="w-full truncate text-[15px] font-semibold">{order.name}</span>
                      {count > 1 && <span className="-mt-1 text-[12px] font-semibold text-accent">{L.tn("scoops", count)}</span>}
                    </Tile>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </>
    );
    primary = isDone(step)
      ? { label: L.t("nextTub"), onClick: next }
      : {
          label: L.t("toFreezer"),
          onClick: () => {
            state.setChecks([step.key, ...step.tiles.map((t) => t.key)], true);
            celebrate(tub.flavor, L.t("toFreezer"));
          },
        };
  } else if (step.kind === "toppings") {
    head = <Heading eyebrow={L.t("finishingTouch")} title={L.t("theToppings")} sub={L.t("tapWhenTopped")} />;
    content = (
      <>
        <div className="space-y-6">
          {step.groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2.5 font-semibold pop:font-display pop:text-[18px]">{g.topping.name}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {g.tiles.map((t, k) => {
                  const done = tileDone(state, g.key, t.key);
                  return (
                    <Tile
                      key={t.key}
                      done={done}
                      tilt={k % 2 ? 2 : -2}
                      label={t.order.name}
                      onTap={() => {
                        buzz();
                        if (done) {
                          if (state.checks.has(g.key))
                            state.setChecks(
                              g.tiles.filter((x) => x !== t).map((x) => x.key),
                              true,
                            );
                          state.setChecks([g.key, t.key], false);
                        } else state.setChecks([t.key], true);
                      }}
                    >
                      <IceCream kind={l.container(t.order.containerId).kind} colors={plan.placed(t.order).map((f) => l.flavor(f))} size={40} />
                      <span className="w-full truncate text-[15px] font-semibold">{t.order.name}</span>
                    </Tile>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </>
    );
    primary = {
      label: L.t("toppingsDone"),
      onClick: () => {
        state.setChecks(
          step.groups.flatMap((g) => [g.key, ...g.tiles.map((t) => t.key)]),
          true,
        );
        next();
      },
    };
  } else {
    // Who is still waiting comes first; served ice creams slide to the end
    const ordered = [...plan.orders].sort((a, b) => Number(state.isServed(a.id)) - Number(state.isServed(b.id)));
    const waiting = plan.orders.filter((o) => !state.isServed(o.id)).length;
    head = (
      <Heading
        eyebrow={L.t("lastStep")}
        title={L.t("serveTitle")}
        sub={waiting ? L.t("tapWhenGiven", { n: waiting }) : L.t("everyoneServedDot")}
      />
    );
    content = (
      <>
        <div className="grid grid-cols-2 gap-2.5">
          {ordered.map((o, k) => {
            const served = state.isServed(o.id);
            return (
              <Tile
                key={o.id}
                done={served}
                tilt={k % 2 ? 2 : -2}
                label={`${o.name}, ${describeOrder(menu, o)}`}
                onTap={() => {
                  buzz(served ? 12 : 25);
                  state.serve(o.id, !served);
                }}
              >
                <motion.span animate={served ? { y: [0, -10, 0], rotate: [0, -6, 0] } : {}} transition={{ duration: 0.4 }}>
                  <IceCream kind={l.container(o.containerId).kind} colors={plan.placed(o).map((f) => l.flavor(f))} size={48} />
                </motion.span>
                <span className="w-full truncate text-[16px] font-semibold">{o.name}</span>
                <span className="line-clamp-2 text-[12px] leading-snug text-muted">{describeOrder(menu, o)}</span>
                {o.note && <span className="line-clamp-2 text-[12px] italic text-ink/80">« {o.note} »</span>}
                {served && <span className="text-[12px] font-semibold text-pistache">{L.t("servedTile")}</span>}
              </Tile>
            );
          })}
        </div>
      </>
    );
    primary = waiting ? { label: L.t("stillToServe", { n: waiting }) } : { label: L.t("finish"), onClick: next };
  }

  // Pop look: a tub's screen takes the flavor's colour and pattern
  const flavorBg = pop && step?.kind === "tub" ? step.tub.flavor : null;

  // On the body: the page's entrance animation would otherwise trap this
  // fixed layer under the header and the bottom bar
  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        className={clsx("fixed inset-0 z-[60] flex flex-col transition-colors duration-500", pop && !flavorBg ? "bg-surface" : "bg-canvas")}
        style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)", background: flavorBg?.color }}
        role="dialog"
        aria-modal="true"
        aria-label={L.t("serviceTab")}
      >
        {flavorBg && <PatternField look={flavorBg} />}
        <header className="relative flex items-center gap-3 px-3 pt-2 pop:gap-2.5 pop:px-[18px] pop:pt-4">
          <button
            className="icon-btn text-ink pop:rounded-2xl pop:border-[3px] pop:border-ink pop:bg-canvas pop:hover:bg-canvas"
            onClick={onExit}
            aria-label={L.t("quitService")}
          >
            <X size={22} strokeWidth={pop ? 2.8 : 2} />
          </button>
          <div className="flex flex-1 gap-1 pop:gap-[5px]" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={clsx(
                  "flex-1 rounded-full transition-colors duration-300",
                  pop ? "h-3 border-[2.5px] border-ink" : "h-1.5",
                  isDone(s) ? "bg-pistache" : i === index ? (pop ? "bg-accent" : "bg-ink") : pop ? "bg-canvas" : "bg-sunken",
                )}
              />
            ))}
          </div>
          <span
            className={clsx(
              "tabular text-right",
              pop ? "flex-none rounded-full bg-ink px-2.5 py-1 font-display text-[14px] font-semibold text-onink" : "w-12 text-sm font-medium text-muted",
            )}
          >
            {Math.min(index + 1, steps.length)}/{steps.length}
          </span>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={step?.id ?? "end"}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if ((info.offset.x < -80 || info.velocity.x < -500) && index < steps.length) go(index + 1, 1);
                else if ((info.offset.x > 80 || info.velocity.x > 500) && index > 0) go(index - 1, -1);
              }}
              className={clsx(
                "absolute inset-0",
                pop && step ? "flex flex-col px-[14px] pt-5" : "overflow-y-auto px-5 pb-8 pt-5",
              )}
            >
              {pop && step ? (
                <>
                  <div style={flavorBg ? { color: inkOn(flavorBg.color) } : undefined}>{head}</div>
                  {/* The card ends with its tiles; past the screen they scroll inside it */}
                  <div className="mt-5 min-h-0 shrink overflow-y-auto rounded-[34px] border-[3px] border-ink bg-canvas px-4 pb-5 pt-5">
                    {content}
                  </div>
                </>
              ) : (
                <>
                  {head}
                  {content}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step && (
          <footer className="relative flex items-center gap-2 border-t border-line/70 px-3 py-3 pop:gap-2.5 pop:border-0 pop:px-[18px] pop:pb-6 pop:pt-4">
            <button
              className="icon-btn text-ink disabled:opacity-30 pop:border-[3px] pop:border-ink pop:bg-canvas pop:hover:bg-canvas"
              onClick={() => go(index - 1, -1)}
              disabled={index === 0}
              aria-label={L.t("prevStep")}
            >
              <ChevronLeft size={24} />
            </button>
            {primary && (
              <button className="btn-ink min-h-[52px] flex-1 text-[16px] pop:text-[19px] pop:font-bold" onClick={primary.onClick} disabled={!primary.onClick}>
                {primary.label}
              </button>
            )}
            <button
              className="icon-btn text-ink pop:border-[3px] pop:border-ink pop:bg-canvas pop:hover:bg-canvas"
              onClick={() => go(index + 1, 1)}
              aria-label={L.t("nextStep")}
            >
              <ChevronRight size={24} />
            </button>
          </footer>
        )}
      </div>
      <AnimatePresence>{party && <FreezerParty key={party.n} look={party.look} label={party.label} />}</AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}
