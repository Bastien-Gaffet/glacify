import { lazy, Suspense, type ReactNode } from "react";
import { Check, ChevronRight, IceCreamBowl, IceCreamCone, Play, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { buildPlan } from "@contracts/plan";
import { IceCream } from "@/components/IceCream";
import { FlavorDot } from "@/components/FlavorPattern";
import { confirmDialog } from "@/components/Confirm";
import { describeOrder, lookup, plural } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { showError } from "@/lib/errors";
import type { RoundData } from "./types";
import { useServiceState } from "./useServiceState";
import { checkKey, groupLabel, serviceSteps, stepDone } from "./serviceSteps";

// Loaded when the service starts: guests never download the animations
const ServiceMode = lazy(() => import("./ServiceMode").then((m) => ({ default: m.ServiceMode })));

function Step({ n, title, hint, children }: { n: number; title: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2.5 font-display text-[20px] font-bold">
        <span className="tabular flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[13px] text-onink">{n}</span>
        {title}
      </h2>
      {hint && <p className="mb-3 pl-[38px] text-sm text-muted">{hint}</p>}
      <div className={clsx("space-y-2", !hint && "mt-3")}>{children}</div>
    </section>
  );
}

function Task({
  done,
  onToggle,
  lead,
  title,
  sub,
  count,
}: {
  done: boolean;
  onToggle: () => void;
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      className={clsx(
        "flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition active:scale-[0.99]",
        done ? "bg-surface/60" : "bg-surface hover:bg-sunken",
      )}
    >
      <span
        className={clsx(
          "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 transition",
          done ? "border-pistache bg-pistache text-white" : "border-line bg-canvas",
        )}
      >
        {done && <Check size={16} strokeWidth={3} />}
      </span>
      {lead}
      <span className={clsx("min-w-0 flex-1 transition", done && "opacity-45")}>
        <span className={clsx("block font-semibold", done && "line-through")}>{title}</span>
        {sub && <span className="block text-sm leading-snug text-muted">{sub}</span>}
      </span>
      {count !== undefined && (
        <span className={clsx("tabular font-display text-[26px] font-bold leading-none", done ? "text-muted/50" : "text-ink")}>{count}</span>
      )}
    </button>
  );
}

/**
 * The service tab: a button that starts the step-by-step service, then the
 * recap of the plan (containers, one tub at a time, toppings, who wanted
 * what), which can be ticked here too.
 */
export function Service({
  data,
  onClose,
  mode,
  onMode,
}: {
  data: RoundData;
  onClose: () => void;
  /** The full-screen service is open */
  mode: boolean;
  onMode: (open: boolean) => void;
}) {
  const { t, tn } = useI18n();
  const { round, orders, menu } = data;
  const l = lookup(menu);
  const plan = buildPlan(orders, menu, t("removedFlavor"));
  const state = useServiceState(data);
  const { checks } = state;
  const utils = trpc.useUtils();
  const reset = trpc.rounds.resetService.useMutation({
    onSuccess: () => utils.rounds.get.invalidate({ id: round.id }),
    onError: showError,
  });

  if (plan.orders.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center">
        <p className="font-display text-lg font-bold">{t("nothingToServe")}</p>
        <p className="mt-1 text-[15px] text-muted">{t("planAppears")}</p>
      </div>
    );
  }

  const steps = serviceSteps(plan);
  const doneSteps = steps.filter((s) => stepDone(s, state, plan)).length;
  const served = plan.orders.filter((o) => state.isServed(o.id)).length;
  const total = plan.orders.length;
  const names = (people: { name: string }[]) => people.map((p) => p.name).join(", ");
  /** A tub or topping row: ticking it ticks the whole group, unticking clears its tiles too */
  const toggleGroup = (key: string, tileKeys: string[], done: boolean) =>
    done ? state.setChecks([key, ...tileKeys], false) : state.setChecks([key], true);
  let step = 1;

  return (
    <div className="space-y-8">
      <button
        onClick={() => onMode(true)}
        className="flex w-full items-center gap-4 rounded-[28px] bg-ink p-5 text-left text-onink transition active:scale-[0.99] pop:border-[3px] pop:border-ink pop:bg-sun pop:text-ink"
      >
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent text-onaccent pop:border-[3px] pop:border-ink">
          <Play size={24} fill="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[21px] font-bold leading-tight">
            {doneSteps === 0 ? t("startService") : doneSteps === steps.length ? t("reviewService") : t("resumeService")}
          </span>
          <span className="mt-0.5 block text-sm text-onink/70 pop:text-ink/75">
            {doneSteps === 0 ? t("startServiceSub", { steps: tn("steps", steps.length) }) : tn("stepsDone", doneSteps, { total: steps.length })}
          </span>
        </span>
        <ChevronRight size={22} className="flex-none text-onink/60 pop:text-ink/60" />
      </button>

      <div className="card p-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <p className="font-semibold">{served === total ? t("everyoneServed") : tn("servedOf", served, { total })}</p>
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            onClick={async () => {
              if (await confirmDialog({ title: t("restartConfirm"), message: t("restartMsg"), confirmLabel: t("restart") }))
                reset.mutate({ id: round.id });
            }}
          >
            <RotateCcw size={15} /> {t("restart")}
          </button>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-pistache transition-all duration-500" style={{ width: `${(served / total) * 100}%` }} />
        </div>
      </div>

      <h2 className="eyebrow -mb-4">{t("recap")}</h2>

      <Step n={step++} title={t("getContainersOut")}>
        {plan.containers.map(({ container, count }) => {
          const key = checkKey.container(container.id, count);
          return (
            <Task
              key={container.id}
              done={checks.has(key)}
              onToggle={() => state.setChecks([key], !checks.has(key))}
              lead={
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas">
                  {container.kind === "cone" ? <IceCreamCone size={20} /> : <IceCreamBowl size={20} />}
                </span>
              }
              title={plural(count, container.name.toLowerCase())}
              count={count}
            />
          );
        })}
      </Step>

      <Step n={step++} title={t("theScoops")} hint={t("tubHint")}>
        {steps.map((s) => {
          if (s.kind !== "tub") return null;
          const done = stepDone(s, state, plan);
          return (
            <Task
              key={s.id}
              done={done}
              onToggle={() =>
                toggleGroup(
                  s.key,
                  s.tiles.map((t) => t.key),
                  done,
                )
              }
              lead={<FlavorDot look={s.tub.flavor} />}
              title={s.tub.flavor.name}
              sub={s.tub.groups.map((g, i) => (
                <span key={i} className="mt-0.5 block">
                  <span className="font-medium text-ink/80">{groupLabel(g, menu)} : </span>
                  {g.people.map((p) => (p.count > 1 ? t("personScoops", { name: p.order.name, n: p.count }) : p.order.name)).join(", ")}
                </span>
              ))}
              count={s.tub.scoops}
            />
          );
        })}
      </Step>

      {plan.toppingGroups.length > 0 && (
        <Step n={step++} title={t("theToppings")}>
          {plan.toppingGroups.map((g) => {
            const key = checkKey.topping(g.topping.id, g.people.length);
            const tileKeys = g.people.map((o) => checkKey.toppingFor(g.topping.id, o.id));
            const done = checks.has(key) || tileKeys.every((k) => checks.has(k));
            return (
              <Task
                key={key}
                done={done}
                onToggle={() => toggleGroup(key, tileKeys, done)}
                title={g.topping.name}
                sub={names(g.people)}
                count={g.people.length}
              />
            );
          })}
        </Step>
      )}

      <Step n={step++} title={t("serve")}>
        {plan.orders.map((o) => (
          <Task
            key={o.id}
            done={state.isServed(o.id)}
            onToggle={() => state.serve(o.id, !state.isServed(o.id))}
            lead={
              <span className="flex w-9 flex-none justify-center">
                <IceCream kind={l.container(o.containerId).kind} colors={plan.placed(o).map((id) => l.flavor(id))} size={30} />
              </span>
            }
            title={o.name}
            sub={
              <>
                {describeOrder(menu, o)}
                {o.note && <span className="block italic text-ink/80">« {o.note} »</span>}
              </>
            }
          />
        ))}
      </Step>

      {served === total && round.status === "open" && (
        <div className="page-in rounded-[28px] bg-ink p-6 text-center text-onink pop:border-[3px] pop:border-ink pop:bg-mint pop:text-ink">
          <p className="font-display text-[22px] font-bold">{t("enjoy")}</p>
          <p className="mt-1 text-sm text-onink/70 pop:text-ink/75">{t("allServedClose")}</p>
          <button className="btn mt-4 bg-onink px-6 text-ink hover:bg-onink/90 pop:border-[3px] pop:border-ink pop:bg-accent pop:text-onaccent pop:shadow-pop" onClick={onClose}>
            {t("closeRound")}
          </button>
        </div>
      )}

      {mode && (
        <Suspense fallback={null}>
          <ServiceMode
            data={data}
            state={state}
            onExit={() => onMode(false)}
            onCloseRound={() => {
              onClose();
              onMode(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
