import { useEffect, useRef, useState } from "react";
import { Copy, Plus, QrCode, Smartphone, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { inkOn } from "@contracts/menu";
import { countFlavors } from "@contracts/plan";
import { IceCream } from "@/components/IceCream";
import { EmptyArt } from "@/components/EmptyArt";
import { confirmDialog } from "@/components/Confirm";
import { describeOrder, lookup } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { buzz } from "@/lib/feel";
import { play } from "@/lib/sound";
import { trpc } from "@/providers/trpc";
import { showError } from "@/lib/errors";
import type { EditTarget } from "./OrderSheet";
import type { RoundData } from "./types";

export function Orders({
  data,
  onEdit,
  onShare,
  onService,
}: {
  data: RoundData;
  onEdit: (t: EditTarget) => void;
  onShare: () => void;
  onService: () => void;
}) {
  const { t, tn } = useI18n();
  const { round, orders, menu } = data;
  const l = lookup(menu);
  const open = round.status === "open";
  const utils = trpc.useUtils();
  const remove = trpc.rounds.removeOrder.useMutation({
    onSuccess: () => utils.rounds.get.invalidate({ id: round.id }),
    onError: showError,
  });

  // Orders sent from the link while the list is open: they drop in, the phone rings
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(() => new Set());
  const freshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const before = seen.current;
    seen.current = new Set(orders.map((o) => o.id));
    if (!before) return;
    const arrived = orders.filter((o) => !before.has(o.id) && o.source === "guest").map((o) => o.id);
    if (!arrived.length) return;
    buzz("success");
    play("ding");
    setFresh(new Set(arrived));
    clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(new Set()), 2600);
  }, [orders]);
  useEffect(() => () => clearTimeout(freshTimer.current), []);

  const counts = [...countFlavors(orders)].sort((a, b) => b[1] - a[1]);
  const limit = data.limits.ordersPerRound;

  return (
    <div className="space-y-6">
      {open && (
        <button onClick={onShare} className="card flex w-full items-center gap-4 p-4 text-left transition hover:bg-sunken/70">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-ink text-onink pop:border-[2.5px] pop:border-ink pop:bg-lemon pop:text-ink">
            <QrCode size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("groupOrder")}</span>
            <span className="block text-sm text-muted">{t("groupOrderSub")}</span>
          </span>
        </button>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-line px-6 py-8 text-center pop:border-[3px] pop:border-ink/25">
          <EmptyArt kind="orders" size={130} />
          <p className="mt-3 font-display text-lg font-bold">{t("noOrdersYet")}</p>
          <p className="mt-1 text-[15px] text-muted">{open ? t("shareOrAdd") : t("reopenToTake")}</p>
        </div>
      ) : (
        <ul className="stagger space-y-2">
          {orders.map((o) => {
            const c = l.container(o.containerId);
            return (
              <li
                key={o.id}
                className={clsx("card flex items-center gap-3 p-3 pr-2 transition-shadow duration-700", fresh.has(o.id) && "drop-in ring-4 ring-accent/30")}
              >
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onEdit({ mode: "edit", order: o })}>
                  <div className="flex w-12 flex-none justify-center">
                    <IceCream kind={c.kind} colors={o.scoops.map((id) => l.flavor(id))} size={40} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{o.name}</span>
                      {o.source === "guest" && <Smartphone size={14} className="flex-none text-muted" aria-label={t("orderedFromLink")} />}
                      {fresh.has(o.id) && <span className="chip pop-in flex-none bg-accent px-2 py-0.5 text-[11px] text-onaccent">{t("newChip")}</span>}
                      {o.servedAt && <span className="chip flex-none bg-pistache/15 px-2 py-0.5 text-[11px] text-pistache">{t("servedChip")}</span>}
                    </p>
                    <p className="text-sm leading-snug text-muted">{describeOrder(menu, o)}</p>
                    {o.note && <p className="mt-0.5 text-sm italic text-ink/80">« {o.note} »</p>}
                  </div>
                </button>
                <div className="flex flex-none flex-col">
                  <button
                    className="icon-btn h-10 w-10"
                    aria-label={t("sameForSomeone")}
                    title={t("sameForSomeone")}
                    onClick={() => onEdit({ mode: "new", from: { containerId: o.containerId, scoops: o.scoops, toppings: o.toppings, note: "" } })}
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    className="icon-btn h-10 w-10 hover:text-danger"
                    aria-label={t("delete")}
                    onClick={async () => {
                      if (await confirmDialog({ title: t("deleteIceConfirm", { name: o.name }), confirmLabel: t("delete"), danger: true }))
                        remove.mutate({ id: o.id });
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <button className="btn-soft w-full py-4" onClick={() => onEdit({ mode: "new" })}>
          <Plus size={18} /> {t("addIce")}
        </button>
      )}
      {limit && open && <p className="-mt-3 text-center text-xs text-muted">{t("freeLimitNote", { n: limit })}</p>}

      {counts.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2.5 px-1">{t("toPrepare")}</h2>
          <div className="flex flex-wrap gap-2">
            {counts.map(([id, n]) => {
              const f = l.flavor(id);
              return (
                <span key={id} className="chip py-2 text-[14px]" style={{ background: f.color, color: inkOn(f.color) }}>
                  {f.name} <b className="tabular">{n}</b>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {orders.length > 0 && (
        <div className="sticky bottom-[calc(84px+var(--safe-bottom))] pt-2 pop:bottom-[calc(108px+var(--safe-bottom))]">
          <button className="btn-ink w-full py-4 text-base shadow-soft" onClick={onService}>
            {t("goToService", { scoops: tn("scoops", orders.reduce((n, o) => n + o.scoops.length, 0)) })}
          </button>
        </div>
      )}
    </div>
  );
}
