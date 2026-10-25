import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Check, Pencil, Plus, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { IceCream } from "@/components/IceCream";
import { confirmDialog } from "@/components/Confirm";
import { OrderForm, draftToInput, emptyDraft, toDraft, type Draft } from "@/components/OrderForm";
import { describeOrder, lookup } from "@/lib/format";
import { showError } from "@/lib/errors";

/** The guest's secret for this round (lets them change their own orders), kept by the browser. */
const tokenKey = (code: string) => `glacify.guest.${code.toUpperCase()}`;
const NAME_KEY = "glacify.guest.name";
const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? undefined;
  } catch {
    return undefined;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: works for this visit */
  }
};

type Composing = { id?: number; draft: Draft } | null;

function Brand() {
  return (
    <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
      <img src="/mark.svg" alt="" className="h-6 w-6" /> Glacify
    </Link>
  );
}

/**
 * Public page of a round (/t/<code>): anyone with the link picks their ice
 * cream on their own phone, no account. The host sees it arrive live.
 */
export default function GuestOrder() {
  const code = (useParams().code ?? "").toUpperCase();
  const [token, setToken] = useState(() => read(tokenKey(code)));
  const [composing, setComposing] = useState<Composing>(null);

  const { data, isLoading, error } = trpc.guest.round.useQuery(
    { code, token },
    { retry: false, refetchInterval: composing ? false : 5000 },
  );
  const utils = trpc.useUtils();
  const refresh = () => utils.guest.round.invalidate();
  const place = trpc.guest.placeOrder.useMutation({
    onSuccess: (res) => {
      write(tokenKey(code), res.token);
      setToken(res.token);
      setComposing(null);
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: showError,
  });
  const update = trpc.guest.updateOrder.useMutation({
    onSuccess: () => (setComposing(null), refresh(), toast.success("Commande modifiée")),
    onError: showError,
  });
  const cancel = trpc.guest.cancelOrder.useMutation({ onSuccess: refresh, onError: showError });

  if (isLoading) return null;
  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <IceCream kind="cup" colors={[]} size={64} />
        <h1 className="mt-6 font-display text-2xl font-bold">Lien introuvable</h1>
        <p className="mt-2 text-muted">Ce lien de commande n'existe pas ou plus. Demandez-en un nouveau à la personne qui sert les glaces.</p>
      </div>
    );
  }

  const { menu, mine } = data;
  const l = lookup(menu);
  const others = data.orders.filter((o) => !o.mine);
  const showForm = data.open && (composing || mine.length === 0);
  const draft = composing?.draft ?? emptyDraft(menu, read(NAME_KEY) ?? "");
  const setDraft = (d: Draft) => setComposing({ id: composing?.id, draft: d });

  const submit = () => {
    const input = draftToInput(draft, "");
    if (!input.name) return toast.error("Indiquez un prénom");
    if (mine.length === 0) write(NAME_KEY, input.name);
    if (composing?.id && token) update.mutate({ code, token, id: composing.id, order: input });
    else place.mutate({ code, token, order: input });
  };

  return (
    <div className="mx-auto max-w-lg px-5 pb-[calc(110px+var(--safe-bottom))] pt-6">
      <div className="page-in">
        <Brand />
        <p className="eyebrow mb-1.5 mt-6">{data.hostName} vous sert des glaces</p>
        <h1 className="title">{data.title}</h1>
      </div>

      {!data.open && (
        <div className="card mt-6 p-5">
          <p className="font-semibold">Les commandes sont fermées</p>
          <p className="mt-1 text-sm text-muted">Pour une glace de plus, voyez directement avec {data.hostName}.</p>
        </div>
      )}

      {mine.length > 0 && !composing && (
        <section className="mt-7 space-y-2.5">
          <h2 className="eyebrow px-1">{mine.length > 1 ? "Vos glaces" : "Votre glace"}</h2>
          {mine.map((o) => {
            const served = !!o.servedAt;
            return (
              <div key={o.id} className={`page-in flex items-center gap-4 rounded-3xl p-4 ${served ? "bg-pistache/10" : "bg-surface"}`}>
                <div className="flex w-14 flex-none justify-center">
                  <IceCream kind={l.container(o.containerId).kind} colors={o.scoops.map((id) => l.flavor(id).color)} size={50} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">{o.name}</p>
                  <p className="text-sm leading-snug text-muted">{describeOrder(menu, o)}</p>
                  <p className={`mt-1.5 flex items-center gap-1 text-sm font-semibold ${served ? "text-pistache" : "text-ink"}`}>
                    {served ? (
                      <>
                        <Check size={16} strokeWidth={3} /> Servie, bonne dégustation
                      </>
                    ) : (
                      "Commande reçue"
                    )}
                  </p>
                </div>
                {data.open && !served && (
                  <div className="flex flex-none flex-col">
                    <button className="icon-btn h-10 w-10" aria-label="Modifier" onClick={() => {
                        refresh();
                        setComposing({ id: o.id, draft: toDraft(o) });
                      }}>
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-btn h-10 w-10 hover:text-danger"
                      aria-label="Annuler cette glace"
                      onClick={async () => {
                        if (token && (await confirmDialog({ title: "Annuler cette glace ?", confirmLabel: "Annuler la glace", danger: true })))
                          cancel.mutate({ code, token, id: o.id });
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {data.open && (
            <button className="btn-soft w-full py-4" onClick={() => {
                // Fresh carte: a flavor may have run out since the page opened
                refresh();
                setComposing({ draft: emptyDraft(menu) });
              }}>
              <Plus size={18} /> Ajouter une autre glace
            </button>
          )}
        </section>
      )}

      {showForm && (
        <section className="page-in mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold">{composing?.id ? "Modifier la glace" : "Choisissez votre glace"}</h2>
            {composing && mine.length > 0 && (
              <button className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setComposing(null)}>
                Annuler
              </button>
            )}
          </div>
          <OrderForm menu={menu} draft={draft} onChange={setDraft} guest nameLabel={mine.length === 0 ? "Votre prénom" : "Pour qui ?"} />
        </section>
      )}

      {others.length > 0 && !composing && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2.5 px-1">Ont déjà commandé</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <span key={o.id} className={`chip py-2 text-[14px] ${o.served ? "bg-pistache/15 text-pistache" : "bg-surface"}`}>
                {o.served && <Check size={14} strokeWidth={3} />}
                {o.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[max(1rem,var(--safe-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto max-w-lg px-5">
            <button className="btn-ink w-full py-4 text-base" disabled={draft.scoops.length === 0 || place.isPending || update.isPending} onClick={submit}>
              {composing?.id ? "Enregistrer" : draft.scoops.length === 0 ? "Choisissez au moins un parfum" : "Envoyer ma commande"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
