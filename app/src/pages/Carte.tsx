import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, IceCreamBowl, IceCreamCone, Minus, Pipette, Plus, RotateCcw, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { ACCENT_PALETTE, DEFAULT_ACCENT, FLAVOR_PALETTE, FLAVOR_PATTERNS, MAX_SCOOPS, inkOn, type ContainerKind, type FlavorPattern, type Menu } from "@contracts/menu";
import { FlavorDot } from "@/components/FlavorPattern";
import { ColorPicker } from "@/components/ColorPicker";
import { IconTile } from "@/components/menu";
import { usePop } from "@/lib/style";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { Switch } from "@/components/Switch";
import { Segmented } from "@/components/Segmented";
import { confirmDialog } from "@/components/Confirm";
import { showError } from "@/lib/errors";
import { useI18n, type TKey } from "@/lib/i18n";

type Kind = "flavors" | "toppings" | "containers";
type Editing =
  | { kind: "flavors"; id?: number; name: string; color: string; pattern: FlavorPattern; accent: string; available: boolean }
  | { kind: "toppings"; id?: number; name: string; available: boolean }
  | { kind: "containers"; id?: number; name: string; containerKind: ContainerKind; maxScoops: number; available: boolean };

function Section({ title, hint, onAdd, addLabel, children }: { title: string; hint: string; onAdd: () => void; addLabel: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-display text-[22px] font-bold">{title}</h2>
          <p className="text-sm text-muted">{hint}</p>
        </div>
        <button className="icon-btn flex-none bg-surface text-ink pop:border-[3px] pop:border-ink pop:bg-lemon" onClick={onAdd} aria-label={addLabel}>
          <Plus size={20} />
        </button>
      </div>
      <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line pop:[&>*+*]:border-t-2 pop:[&>*+*]:border-ink/10">{children}</div>
    </section>
  );
}

/** Pop: a flavor as a sticker card, its switch on top, its name and state below */
function FlavorCard({ f, onToggle, onEdit }: { f: Menu["flavors"][number]; onToggle: (v: boolean) => void; onEdit: () => void }) {
  const { t } = useI18n();
  return (
    <div className={clsx("flex flex-col gap-1.5 rounded-[24px] border-[3px] border-ink p-2.5 pl-3", f.available ? "bg-canvas" : "bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} aria-label={t("editFlavor")} className={clsx("transition active:scale-95", !f.available && "opacity-60")}>
          <FlavorDot look={f} className="block h-11 w-11 !rounded-[14px] border-[3px] border-ink" />
        </button>
        <Switch checked={f.available} onChange={onToggle} label={t("availableLabel", { name: f.name })} />
      </div>
      <button onClick={onEdit} className="min-w-0 text-left">
        <span className={clsx("block truncate font-display text-[17px] font-bold", !f.available && "opacity-60")}>
          {f.name}
        </span>
        <span className={clsx("block text-[11px] font-extrabold uppercase", f.available ? "text-pistache" : "text-accent")}>
          {f.available ? t("available") : t("soldOut")}
        </span>
      </button>
    </div>
  );
}

function Row({ lead, title, sub, available, onToggle, onEdit }: { lead?: ReactNode; title: string; sub: string; available: boolean; onToggle: (v: boolean) => void; onEdit: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 pr-4">
      <button className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 pl-4 text-left" onClick={onEdit}>
        {lead}
        <span className={clsx("min-w-0 flex-1", !available && "opacity-50")}>
          <span className="block truncate font-semibold">{title}</span>
          <span className="block text-sm text-muted">{sub}</span>
        </span>
      </button>
      <Switch checked={available} onChange={onToggle} label={t("availableLabel", { name: title })} />
    </div>
  );
}

const SHEET_TITLES: Record<Kind, [edit: TKey, add: TKey]> = {
  flavors: ["editFlavor", "newFlavor"],
  toppings: ["editTopping", "newTopping"],
  containers: ["editContainer", "newContainer"],
};

function EditSheet({ editing, setEditing, onDone, palette }: { editing: Editing | null; setEditing: (e: Editing | null) => void; onDone: () => void; palette: string[] }) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  const opts = { onSuccess: () => (onDone(), setEditing(null)), onError: showError };
  const saveFlavor = trpc.menu.saveFlavor.useMutation(opts);
  const saveTopping = trpc.menu.saveTopping.useMutation(opts);
  const saveContainer = trpc.menu.saveContainer.useMutation(opts);
  const remove = trpc.menu.remove.useMutation(opts);
  if (!editing) return null;

  const busy = saveFlavor.isPending || saveTopping.isPending || saveContainer.isPending || remove.isPending;
  const e = editing;
  const save = () => {
    const name = e.name.trim();
    if (!name) return;
    if (e.kind === "flavors") saveFlavor.mutate({ id: e.id, name, color: e.color, pattern: e.pattern, accent: e.accent, available: e.available });
    else if (e.kind === "toppings") saveTopping.mutate({ id: e.id, name, available: e.available });
    else saveContainer.mutate({ id: e.id, name, kind: e.containerKind, maxScoops: e.maxScoops, available: e.available });
  };

  return (
    <Sheet
      open
      onClose={() => setEditing(null)}
      title={t(SHEET_TITLES[e.kind][e.id ? 0 : 1])}
      footer={
        <div className="flex gap-2">
          {e.id && (
            <button
              className="icon-btn h-[52px] w-[52px] bg-surface hover:text-danger"
              aria-label={t("removeFromMenu")}
              disabled={busy}
              onClick={async () => {
                if (await confirmDialog({ title: t("removeConfirm", { name: e.name }), message: t("removeMsg"), confirmLabel: t("remove"), danger: true }))
                  remove.mutate({ kind: e.kind, id: e.id! });
              }}
            >
              <Trash2 size={19} />
            </button>
          )}
          <button className="btn-ink flex-1 py-4" disabled={!e.name.trim() || busy} onClick={save}>
            {e.id ? t("save") : t("add")}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {e.kind === "flavors" && (
          <div className="flex justify-center py-2">
            <FlavorDot look={e} className="h-24 w-24 shadow-[inset_0_-6px_0_rgb(0_0_0/0.08)] pop:-rotate-3 pop:!rounded-[30px] pop:border-[3px] pop:border-ink pop:shadow-pop" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="item-name">
            {t("name")}
          </label>
          <input id="item-name" className="field" value={e.name} onChange={(ev) => setEditing({ ...e, name: ev.target.value })} maxLength={e.kind === "containers" ? 40 : 60} autoFocus={!e.id} />
        </div>
        {e.kind === "flavors" && (
          <div>
            <p className="label">{t("color")}</p>
            <div className="grid grid-cols-8 gap-2">
              {FLAVOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditing({ ...e, color: c })}
                  className="flex aspect-square items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] transition active:scale-90 pop:border-2 pop:border-ink pop:shadow-none"
                  style={{ background: c, color: inkOn(c) }}
                  aria-label={t("colorN", { c })}
                  aria-pressed={e.color.toUpperCase() === c.toUpperCase()}
                >
                  {e.color.toUpperCase() === c.toUpperCase() && <Check size={16} strokeWidth={3} />}
                </button>
              ))}
            </div>
            <button type="button" className="btn-soft mt-3 py-2.5 pl-2.5" onClick={() => setPicking(true)}>
              <span className="h-7 w-7 rounded-full border-2 border-ink/20 pop:border-[2.5px] pop:border-ink" style={{ background: e.color }} />
              <Pipette size={17} /> {t("otherColor")}
            </button>
            <ColorPicker
              open={picking}
              onClose={() => setPicking(false)}
              title={e.name.trim() ? t("colorOf", { name: e.name.trim() }) : t("colorOfNew")}
              look={e}
              palette={palette}
              onPick={(color) => {
                setEditing({ ...e, color });
                setPicking(false);
              }}
            />
          </div>
        )}
        {e.kind === "flavors" && (
          <div>
            <p className="label">{t("pattern")}</p>
            <div className="grid grid-cols-5 gap-2">
              {FLAVOR_PATTERNS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEditing({ ...e, pattern: p })}
                  aria-pressed={e.pattern === p}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-2xl py-2 text-[12px] font-medium transition active:scale-95",
                    e.pattern === p ? "bg-ink text-onink pop:bg-accent pop:text-onaccent" : "bg-surface text-ink",
                    "pop:border-[2.5px] pop:border-ink",
                  )}
                >
                  <FlavorDot look={{ color: e.color, pattern: p, accent: e.accent }} className="h-10 w-10" />
                  {t(`pattern_${p}`)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("patternHint")}</p>
            {e.pattern !== "none" && (
              <>
                <p className="label mt-4">{t("patternColor")}</p>
                <div className="grid grid-cols-8 gap-2">
                  {ACCENT_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...e, accent: c })}
                      className="flex aspect-square items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition active:scale-90"
                      style={{ background: c, color: inkOn(c) }}
                      aria-label={t("colorN", { c })}
                      aria-pressed={e.accent.toUpperCase() === c.toUpperCase()}
                    >
                      {e.accent.toUpperCase() === c.toUpperCase() && <Check size={16} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {e.kind === "containers" && (
          <>
            <div>
              <p className="label">{t("type")}</p>
              <Segmented
                label={t("type")}
                value={e.containerKind}
                onChange={(v) => setEditing({ ...e, containerKind: v })}
                options={[
                  { value: "cone", label: (<><IceCreamCone size={16} /> {t("cone")}</>) },
                  { value: "cup", label: (<><IceCreamBowl size={16} /> {t("cup")}</>) },
                ]}
              />
              <p className="mt-1.5 text-xs text-muted">{t("containerTypeHint")}</p>
            </div>
            <div>
              <p className="label">{t("maxScoops")}</p>
              <div className="flex items-center gap-4">
                <button className="icon-btn bg-surface text-ink" disabled={e.maxScoops <= 1} onClick={() => setEditing({ ...e, maxScoops: e.maxScoops - 1 })} aria-label={t("less")}>
                  <Minus size={18} />
                </button>
                <span className="tabular w-8 text-center font-display text-3xl font-bold">{e.maxScoops}</span>
                <button className="icon-btn bg-surface text-ink" disabled={e.maxScoops >= MAX_SCOOPS} onClick={() => setEditing({ ...e, maxScoops: e.maxScoops + 1 })} aria-label={t("more")}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

export default function Carte() {
  const { t, tn, lang } = useI18n();
  const pop = usePop();
  const [tab, setTab] = useState<Kind>("flavors");
  const { data: menu } = trpc.menu.get.useQuery();
  const [editing, setEditing] = useState<Editing | null>(null);
  const utils = trpc.useUtils();
  const refresh = () => {
    utils.menu.get.invalidate();
    utils.rounds.get.invalidate();
  };
  const setAvailable = trpc.menu.setAvailable.useMutation({ onError: (e) => (showError(e), refresh()) });
  const restore = trpc.menu.restoreDefaults.useMutation({
    onSuccess: ({ added }) => (refresh(), toast.success(added ? tn("restored", added) : t("nothingMissing"))),
    onError: showError,
  });
  if (!menu) return null;

  const live = <T extends { archived: boolean }>(items: T[]) => items.filter((x) => !x.archived);
  const toggle = (kind: Kind, id: number, available: boolean) => {
    utils.menu.get.setData(undefined, (m): Menu | undefined =>
      m && { ...m, [kind]: (m[kind] as { id: number }[]).map((x) => (x.id === id ? { ...x, available } : x)) },
    );
    setAvailable.mutate({ kind, id, available }, { onSuccess: () => utils.rounds.get.invalidate() });
  };
  const flavors = live(menu.flavors);
  const out = flavors.filter((f) => !f.available).length;

  const newFlavor = () =>
    setEditing({ kind: "flavors", name: "", color: FLAVOR_PALETTE[flavors.length % FLAVOR_PALETTE.length], pattern: "none", accent: DEFAULT_ACCENT, available: true });
  const editFlavor = (f: Menu["flavors"][number]) =>
    setEditing({ kind: "flavors", id: f.id, name: f.name, color: f.color, pattern: f.pattern, accent: f.accent, available: f.available });
  const palette = flavors.map((f) => f.color);

  if (pop)
    return (
      <div className="page-in space-y-4">
        <PageHeader title={t("myMenu")} eyebrow={t("menuEyebrow")} />
        <div className="-mt-2">
          <Segmented
            label={t("myMenu")}
            value={tab}
            onChange={setTab}
            options={[
              { value: "flavors", label: `${t("flavors")} · ${flavors.length}` },
              { value: "toppings", label: t("toppings") },
              { value: "containers", label: t("containers") },
            ]}
          />
        </div>
        {tab === "flavors" && (
          <>
            <p className="px-1 text-[13px] font-bold text-muted">{t("menuHintPop")}</p>
            <div className="stagger grid grid-cols-2 gap-2.5">
              {flavors.map((f) => (
                <FlavorCard key={f.id} f={f} onToggle={(v) => toggle("flavors", f.id, v)} onEdit={() => editFlavor(f)} />
              ))}
              <button
                onClick={newFlavor}
                className="flex min-h-[104px] items-center justify-center gap-2 rounded-[24px] border-[3px] border-dashed border-ink/35 font-display text-[16px] font-semibold text-muted transition active:scale-[0.97]"
              >
                <Plus size={20} strokeWidth={2.8} /> {t("aFlavor")}
              </button>
            </div>
          </>
        )}
        {tab === "toppings" && (
          <Section title={t("toppings")} hint={t("toppingsHint")} addLabel={t("addTopping")} onAdd={() => setEditing({ kind: "toppings", name: "", available: true })}>
            {live(menu.toppings).length === 0 && <p className="px-4 py-5 text-sm text-muted">{t("noTopping")}</p>}
            {live(menu.toppings).map((tp) => (
              <Row
                key={tp.id}
                title={tp.name}
                sub={tp.available ? t("available") : t("soldOut")}
                available={tp.available}
                onToggle={(v) => toggle("toppings", tp.id, v)}
                onEdit={() => setEditing({ kind: "toppings", id: tp.id, name: tp.name, available: tp.available })}
              />
            ))}
          </Section>
        )}
        {tab === "containers" && (
          <Section
            title={t("containers")}
            hint={t("containersHint")}
            addLabel={t("addContainer")}
            onAdd={() => setEditing({ kind: "containers", name: "", containerKind: "cup", maxScoops: 3, available: true })}
          >
            {live(menu.containers).map((c) => (
              <Row
                key={c.id}
                lead={<IconTile icon={c.kind === "cone" ? IceCreamCone : IceCreamBowl} tone={c.kind === "cone" ? "sun" : "mint"} />}
                title={c.name}
                sub={tn("maxScoopsSub", c.maxScoops)}
                available={c.available}
                onToggle={(v) => toggle("containers", c.id, v)}
                onEdit={() => setEditing({ kind: "containers", id: c.id, name: c.name, containerKind: c.kind, maxScoops: c.maxScoops, available: c.available })}
              />
            ))}
          </Section>
        )}
        <button className="btn-ghost mx-auto flex" onClick={() => restore.mutate({ lang })} disabled={restore.isPending}>
          <RotateCcw size={16} /> {t("restoreClassics")}
        </button>
        <EditSheet editing={editing} setEditing={setEditing} onDone={refresh} palette={palette} />
      </div>
    );

  return (
    <div className="page-in space-y-9">
      <PageHeader title={t("myMenu")}>
        <p className="mt-2 text-[15px] text-muted">{t("menuIntro")}</p>
      </PageHeader>

      <Section
        title={t("flavors")}
        hint={[tn("flavorCount", flavors.length), out ? tn("soldOutCount", out) : ""].filter(Boolean).join(", ")}
        addLabel={t("addFlavor")}
        onAdd={newFlavor}
      >
        {flavors.map((f) => (
          <Row
            key={f.id}
            lead={<FlavorDot look={f} />}
            title={f.name}
            sub={f.available ? t("available") : t("soldOut")}
            available={f.available}
            onToggle={(v) => toggle("flavors", f.id, v)}
            onEdit={() => editFlavor(f)}
          />
        ))}
      </Section>

      <Section title={t("toppings")} hint={t("toppingsHint")} addLabel={t("addTopping")} onAdd={() => setEditing({ kind: "toppings", name: "", available: true })}>
        {live(menu.toppings).length === 0 && <p className="px-4 py-5 text-sm text-muted">{t("noTopping")}</p>}
        {live(menu.toppings).map((tp) => (
          <Row
            key={tp.id}
            title={tp.name}
            sub={tp.available ? t("available") : t("soldOut")}
            available={tp.available}
            onToggle={(v) => toggle("toppings", tp.id, v)}
            onEdit={() => setEditing({ kind: "toppings", id: tp.id, name: tp.name, available: tp.available })}
          />
        ))}
      </Section>

      <Section
        title={t("containers")}
        hint={t("containersHint")}
        addLabel={t("addContainer")}
        onAdd={() => setEditing({ kind: "containers", name: "", containerKind: "cup", maxScoops: 3, available: true })}
      >
        {live(menu.containers).map((c) => (
          <Row
            key={c.id}
            lead={
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas">
                {c.kind === "cone" ? <IceCreamCone size={20} /> : <IceCreamBowl size={20} />}
              </span>
            }
            title={c.name}
            sub={tn("maxScoopsSub", c.maxScoops)}
            available={c.available}
            onToggle={(v) => toggle("containers", c.id, v)}
            onEdit={() => setEditing({ kind: "containers", id: c.id, name: c.name, containerKind: c.kind, maxScoops: c.maxScoops, available: c.available })}
          />
        ))}
      </Section>

      <button className="btn-ghost mx-auto flex" onClick={() => restore.mutate({ lang })} disabled={restore.isPending}>
        <RotateCcw size={16} /> {t("restoreClassics")}
      </button>

      <EditSheet editing={editing} setEditing={setEditing} onDone={refresh} palette={palette} />
    </div>
  );
}
