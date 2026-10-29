import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, IceCreamBowl, IceCreamCone, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { FLAVOR_PALETTE, MAX_SCOOPS, inkOn, type ContainerKind, type Menu } from "@contracts/menu";
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
  | { kind: "flavors"; id?: number; name: string; color: string; available: boolean }
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
        <button className="icon-btn flex-none bg-surface text-ink" onClick={onAdd} aria-label={addLabel}>
          <Plus size={20} />
        </button>
      </div>
      <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line">{children}</div>
    </section>
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

function EditSheet({ editing, setEditing, onDone }: { editing: Editing | null; setEditing: (e: Editing | null) => void; onDone: () => void }) {
  const { t } = useI18n();
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
    if (e.kind === "flavors") saveFlavor.mutate({ id: e.id, name, color: e.color, available: e.available });
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
            <span className="flex h-24 w-24 items-center justify-center rounded-full text-sm font-semibold shadow-[inset_0_-6px_0_rgb(0_0_0/0.08)]" style={{ background: e.color, color: inkOn(e.color) }} />
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
                  className="flex aspect-square items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] transition active:scale-90"
                  style={{ background: c, color: inkOn(c) }}
                  aria-label={t("colorN", { c })}
                  aria-pressed={e.color.toUpperCase() === c.toUpperCase()}
                >
                  {e.color.toUpperCase() === c.toUpperCase() && <Check size={16} strokeWidth={3} />}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm text-muted">
              <input type="color" value={e.color} onChange={(ev) => setEditing({ ...e, color: ev.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent" />
              {t("otherColor")}
            </label>
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

  return (
    <div className="page-in space-y-9">
      <PageHeader title={t("myMenu")}>
        <p className="mt-2 text-[15px] text-muted">{t("menuIntro")}</p>
      </PageHeader>

      <Section
        title={t("flavors")}
        hint={[tn("flavorCount", flavors.length), out ? tn("soldOutCount", out) : ""].filter(Boolean).join(", ")}
        addLabel={t("addFlavor")}
        onAdd={() => setEditing({ kind: "flavors", name: "", color: FLAVOR_PALETTE[flavors.length % FLAVOR_PALETTE.length], available: true })}
      >
        {flavors.map((f) => (
          <Row
            key={f.id}
            lead={<span className="h-10 w-10 flex-none rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" style={{ background: f.color }} />}
            title={f.name}
            sub={f.available ? t("available") : t("soldOut")}
            available={f.available}
            onToggle={(v) => toggle("flavors", f.id, v)}
            onEdit={() => setEditing({ kind: "flavors", id: f.id, name: f.name, color: f.color, available: f.available })}
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

      <EditSheet editing={editing} setEditing={setEditing} onDone={refresh} />
    </div>
  );
}
