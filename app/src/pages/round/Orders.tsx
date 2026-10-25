import { Copy, Plus, QrCode, Smartphone, Trash2 } from "lucide-react";
import { inkOn } from "@contracts/menu";
import { countFlavors } from "@contracts/plan";
import { IceCream } from "@/components/IceCream";
import { confirmDialog } from "@/components/Confirm";
import { describeOrder, lookup, plural } from "@/lib/format";
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
  const { round, orders, menu } = data;
  const l = lookup(menu);
  const open = round.status === "open";
  const utils = trpc.useUtils();
  const remove = trpc.rounds.removeOrder.useMutation({
    onSuccess: () => utils.rounds.get.invalidate({ id: round.id }),
    onError: showError,
  });

  const counts = [...countFlavors(orders)].sort((a, b) => b[1] - a[1]);
  const limit = data.limits.ordersPerRound;

  return (
    <div className="space-y-6">
      {open && (
        <button onClick={onShare} className="card flex w-full items-center gap-4 p-4 text-left transition hover:bg-sunken/70">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-ink text-onink">
            <QrCode size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Faire commander le groupe</span>
            <span className="block text-sm text-muted">Un lien ou un QR code : chacun choisit sur son téléphone.</span>
          </span>
        </button>
      )}

      {orders.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center">
          <p className="font-display text-lg font-bold">Aucune commande pour l'instant</p>
          <p className="mt-1 text-[15px] text-muted">{open ? "Partagez le lien, ou ajoutez les glaces vous-même." : "Rouvrez la tournée pour prendre des commandes."}</p>
        </div>
      ) : (
        <ul className="stagger space-y-2">
          {orders.map((o) => {
            const c = l.container(o.containerId);
            return (
              <li key={o.id} className="card flex items-center gap-3 p-3 pr-2">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onEdit({ mode: "edit", order: o })}>
                  <div className="flex w-12 flex-none justify-center">
                    <IceCream kind={c.kind} colors={o.scoops.map((id) => l.flavor(id).color)} size={40} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{o.name}</span>
                      {o.source === "guest" && <Smartphone size={14} className="flex-none text-muted" aria-label="Commandé depuis le lien" />}
                      {o.servedAt && <span className="chip flex-none bg-pistache/15 px-2 py-0.5 text-[11px] text-pistache">Servi</span>}
                    </p>
                    <p className="text-sm leading-snug text-muted">{describeOrder(menu, o)}</p>
                    {o.note && <p className="mt-0.5 text-sm italic text-ink/80">« {o.note} »</p>}
                  </div>
                </button>
                <div className="flex flex-none flex-col">
                  <button
                    className="icon-btn h-10 w-10"
                    aria-label="La même pour quelqu'un d'autre"
                    title="La même pour quelqu'un d'autre"
                    onClick={() => onEdit({ mode: "new", from: { containerId: o.containerId, scoops: o.scoops, toppings: o.toppings, note: "" } })}
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    className="icon-btn h-10 w-10 hover:text-danger"
                    aria-label="Supprimer"
                    onClick={async () => {
                      if (await confirmDialog({ title: `Supprimer la glace de ${o.name} ?`, confirmLabel: "Supprimer", danger: true }))
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
          <Plus size={18} /> Ajouter une glace
        </button>
      )}
      {limit && open && <p className="-mt-3 text-center text-xs text-muted">Version gratuite : {limit} glaces par tournée.</p>}

      {counts.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2.5 px-1">À prévoir</h2>
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
        <div className="sticky bottom-[calc(84px+var(--safe-bottom))] pt-2">
          <button className="btn-ink w-full py-4 text-base shadow-soft" onClick={onService}>
            Passer au service · {plural(orders.reduce((n, o) => n + o.scoops.length, 0), "boule")}
          </button>
        </div>
      )}
    </div>
  );
}
