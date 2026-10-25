import { Check, IceCreamBowl, IceCreamCone, X } from "lucide-react";
import { clsx } from "clsx";
import { inkOn, type Menu } from "@contracts/menu";
import { IceCream } from "./IceCream";
import { Segmented } from "./Segmented";
import { lookup } from "@/lib/format";

export type Draft = { name: string; containerId: number; scoops: number[]; toppings: number[]; note: string };

export function emptyDraft(menu: Menu, name = ""): Draft {
  const container = menu.containers.find((c) => !c.archived && c.available) ?? menu.containers[0];
  return { name, containerId: container?.id ?? 0, scoops: [], toppings: [], note: "" };
}

export function toDraft(o: { name: string; containerId: number; scoops: number[]; toppings: number[]; note?: string | null }): Draft {
  return { name: o.name, containerId: o.containerId, scoops: [...o.scoops], toppings: [...o.toppings], note: o.note ?? "" };
}

/** What the API takes: the name defaults to "Glace n" when left empty. */
export function draftToInput(d: Draft, fallbackName: string) {
  return {
    name: d.name.trim() || fallbackName,
    containerId: d.containerId,
    scoops: d.scoops,
    toppings: d.toppings,
    note: d.note.trim() || undefined,
  };
}

/**
 * Composing one ice cream: who it is for, cone or cup, scoops (tap a flavor to
 * add a scoop, tap a scoop to remove it), toppings and a note. The preview
 * builds up as flavors are picked.
 */
export function OrderForm({
  menu,
  draft,
  onChange,
  guest,
  nameLabel = "Pour qui ?",
  autoFocusName,
}: {
  menu: Menu;
  draft: Draft;
  onChange: (d: Draft) => void;
  /** Guests only see what is available today */
  guest?: boolean;
  nameLabel?: string;
  autoFocusName?: boolean;
}) {
  const l = lookup(menu);
  const container = l.container(draft.containerId);
  const max = container.maxScoops;
  const full = draft.scoops.length >= max;
  const inDraft = new Map<number, number>();
  for (const id of draft.scoops) inDraft.set(id, (inDraft.get(id) ?? 0) + 1);

  const containers = menu.containers.filter((c) => !c.archived && (c.available || c.id === draft.containerId));
  const flavors = menu.flavors.filter((f) => !f.archived && (f.available || inDraft.has(f.id) || !guest));
  const toppings = menu.toppings.filter((t) => !t.archived && (t.available || draft.toppings.includes(t.id) || !guest));
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex w-[84px] flex-none justify-center">
          <IceCream kind={container.kind} colors={draft.scoops.map((id) => l.flavor(id).color)} size={76} animateLast />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="label" htmlFor="order-name">
              {nameLabel}
            </label>
            <input
              id="order-name"
              className="field"
              placeholder="Prénom"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={40}
              autoComplete="given-name"
              autoFocus={autoFocusName}
            />
          </div>
          {containers.length > 1 && (
            <Segmented
              label="Contenant"
              value={draft.containerId}
              onChange={(id) => {
                const next = l.container(id);
                set({ containerId: id, scoops: draft.scoops.slice(0, next.maxScoops) });
              }}
              options={containers.map((c) => ({
                value: c.id,
                label: (
                  <>
                    {c.kind === "cone" ? <IceCreamCone size={16} /> : <IceCreamBowl size={16} />}
                    {c.name}
                  </>
                ),
              }))}
            />
          )}
        </div>
      </div>

      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="font-display text-lg font-bold">Parfums</h3>
          <span className={clsx("tabular text-sm", full ? "font-semibold text-ink" : "text-muted")}>
            {draft.scoops.length}/{max} {max > 1 ? "boules" : "boule"}
          </span>
        </div>
        <div className="mb-3 flex min-h-[36px] flex-wrap items-center gap-1.5">
          {draft.scoops.length === 0 ? (
            <p className="text-sm text-muted">Touchez un parfum pour ajouter une boule.</p>
          ) : (
            draft.scoops.map((id, i) => {
              const f = l.flavor(id);
              return (
                <button
                  key={`${i}-${id}`}
                  type="button"
                  onClick={() => set({ scoops: draft.scoops.filter((_, j) => j !== i) })}
                  className="chip"
                  style={{ background: f.color, color: inkOn(f.color) }}
                  aria-label={`Retirer une boule ${f.name}`}
                >
                  {f.name}
                  <X size={14} />
                </button>
              );
            })
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {flavors.map((f) => {
            const n = inDraft.get(f.id);
            const out = !f.available;
            return (
              <button
                key={f.id}
                type="button"
                disabled={full || out}
                onClick={() => set({ scoops: [...draft.scoops, f.id] })}
                className={clsx(
                  "relative flex min-h-[76px] flex-col items-start justify-end rounded-2xl p-2.5 text-left text-[13px] font-semibold leading-tight transition active:scale-95",
                  full && !n && "opacity-40",
                  out && "opacity-40",
                )}
                style={{ background: f.color, color: inkOn(f.color) }}
              >
                <span className="absolute left-2.5 top-2.5 h-3 w-3 rounded-full bg-white/50" />
                {n ? (
                  <span className="tabular absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[12px] text-onink">
                    {n}
                  </span>
                ) : null}
                {f.name}
                {out && <span className="text-[11px] font-medium opacity-80">Épuisé</span>}
              </button>
            );
          })}
        </div>
      </section>

      {toppings.length > 0 && (
        <section>
          <h3 className="mb-2.5 font-display text-lg font-bold">Suppléments</h3>
          <div className="flex flex-wrap gap-2">
            {toppings.map((t) => {
              const on = draft.toppings.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!t.available && !on}
                  onClick={() => set({ toppings: on ? draft.toppings.filter((x) => x !== t.id) : [...draft.toppings, t.id] })}
                  className={clsx(
                    "chip border py-2 text-[14px] transition disabled:opacity-40",
                    on ? "border-ink bg-ink text-onink" : "border-line bg-canvas text-ink hover:border-ink/30",
                  )}
                >
                  {on && <Check size={15} />}
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div>
        <label className="label" htmlFor="order-note">
          Une précision ? (facultatif)
        </label>
        <input
          id="order-note"
          className="field"
          placeholder="Petite boule, sans gluten…"
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
          maxLength={140}
        />
      </div>
    </div>
  );
}
