import type { ReactNode } from "react";
import { Check, IceCreamBowl, IceCreamCone, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { buildPlan } from "@contracts/plan";
import { IceCream } from "@/components/IceCream";
import { confirmDialog } from "@/components/Confirm";
import { describeOrder, lookup, plural } from "@/lib/format";
import { trpc } from "@/providers/trpc";
import { showError } from "@/lib/errors";
import type { RoundData, RoundOrder } from "./types";

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
 * The service plan: containers to get out, scoops flavor by flavor and layer
 * by layer, toppings, then each ice cream to hand over. A step's key carries
 * its count, so a step ticked before a new order arrived shows up again.
 */
export function Service({ data, onClose }: { data: RoundData; onClose: () => void }) {
  const { round, orders, menu } = data;
  const l = lookup(menu);
  const plan = buildPlan(orders, menu);
  const checks = new Set(round.checks);
  const utils = trpc.useUtils();

  // Ticks show at once; the server catches up behind
  const patch = (fn: (d: RoundData) => RoundData) => utils.rounds.get.setData({ id: round.id }, (d) => (d ? fn(d) : d));
  const refresh = () => utils.rounds.get.invalidate({ id: round.id });
  const setCheck = trpc.rounds.setCheck.useMutation({ onError: (e) => (showError(e), refresh()) });
  const setServed = trpc.rounds.setServed.useMutation({ onError: (e) => (showError(e), refresh()) });
  const reset = trpc.rounds.resetService.useMutation({ onSuccess: refresh, onError: showError });

  const toggle = (key: string) => {
    const done = !checks.has(key);
    patch((d) => ({ ...d, round: { ...d.round, checks: done ? [...d.round.checks, key] : d.round.checks.filter((k) => k !== key) } }));
    setCheck.mutate({ id: round.id, key, done });
  };
  const serve = (o: RoundOrder) => {
    const servedAt = o.servedAt ? null : new Date();
    patch((d) => ({ ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, servedAt } : x)) }));
    setServed.mutate({ id: o.id, served: !!servedAt });
  };

  if (plan.orders.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center">
        <p className="font-display text-lg font-bold">Rien à servir pour l'instant</p>
        <p className="mt-1 text-[15px] text-muted">Le plan de service apparaît dès la première commande.</p>
      </div>
    );
  }

  const served = plan.orders.filter((o) => o.servedAt).length;
  const total = plan.orders.length;
  const depth = plan.layers.length;
  const names = (people: { name: string }[]) => people.map((p) => p.name).join(", ");
  const layerTitle = (i: number) => (depth === 1 ? "Les boules" : i === 0 ? "Les premières boules" : i === 1 ? "Les deuxièmes boules" : `Boules n°${i + 1}`);
  let step = 1;

  return (
    <div className="space-y-8">
      <div className="card p-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <p className="font-semibold">{served === total ? "Tout le monde est servi" : `${served} sur ${total} servi${served > 1 ? "s" : ""}`}</p>
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            onClick={async () => {
              if (await confirmDialog({ title: "Recommencer le service ?", message: "Toutes les étapes seront décochées.", confirmLabel: "Recommencer" }))
                reset.mutate({ id: round.id });
            }}
          >
            <RotateCcw size={15} /> Recommencer
          </button>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-pistache transition-all duration-500" style={{ width: `${(served / total) * 100}%` }} />
        </div>
      </div>

      <Step n={step++} title="Sortir les contenants">
        {plan.containers.map(({ container, count }) => (
          <Task
            key={container.id}
            done={checks.has(`c:${container.id}:${count}`)}
            onToggle={() => toggle(`c:${container.id}:${count}`)}
            lead={
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas">
                {container.kind === "cone" ? <IceCreamCone size={20} /> : <IceCreamBowl size={20} />}
              </span>
            }
            title={plural(count, container.name.toLowerCase())}
            count={count}
          />
        ))}
      </Step>

      {plan.layers.map((groups, i) => (
        <Step
          key={i}
          n={step++}
          title={layerTitle(i)}
          hint={depth > 1 && i === 0 ? "Étage par étage : toutes les premières boules, puis les deuxièmes. Un bac ouvert à la fois." : undefined}
        >
          {groups.map((g) => {
            const key = `l${i}:${g.flavorId}:${g.people.length}`;
            return (
              <Task
                key={key}
                done={checks.has(key)}
                onToggle={() => toggle(key)}
                lead={<span className="h-10 w-10 flex-none rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" style={{ background: g.flavor.color }} />}
                title={g.flavor.name}
                sub={names(g.people)}
                count={g.people.length}
              />
            );
          })}
        </Step>
      ))}

      {plan.toppingGroups.length > 0 && (
        <Step n={step++} title="Les suppléments">
          {plan.toppingGroups.map((g) => {
            const key = `t:${g.topping.id}:${g.people.length}`;
            return <Task key={key} done={checks.has(key)} onToggle={() => toggle(key)} title={g.topping.name} sub={names(g.people)} count={g.people.length} />;
          })}
        </Step>
      )}

      <Step n={step++} title="Servir">
        {plan.orders.map((o) => (
          <Task
            key={o.id}
            done={!!o.servedAt}
            onToggle={() => serve(o)}
            lead={
              <span className="flex w-9 flex-none justify-center">
                <IceCream kind={l.container(o.containerId).kind} colors={o.scoops.map((id) => l.flavor(id).color)} size={30} />
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
        <div className="page-in rounded-[28px] bg-ink p-6 text-center text-onink">
          <p className="font-display text-[22px] font-bold">Bonne dégustation</p>
          <p className="mt-1 text-sm text-onink/70">Toutes les glaces sont servies. Fermez la tournée pour la ranger dans l'historique.</p>
          <button className="btn mt-4 bg-onink px-6 text-ink hover:bg-onink/90" onClick={onClose}>
            Fermer la tournée
          </button>
        </div>
      )}
    </div>
  );
}
