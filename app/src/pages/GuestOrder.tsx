import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Check, Pencil, Plus, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { IceCream } from "@/components/IceCream";
import { Confetti } from "@/components/Confetti";
import { EmptyArt } from "@/components/EmptyArt";
import { confirmDialog } from "@/components/Confirm";
import { OrderForm, draftToInput, emptyDraft, toDraft, type Draft } from "@/components/OrderForm";
import { describeOrder, lookup } from "@/lib/format";
import { showError } from "@/lib/errors";
import { LANGS, useI18n } from "@/lib/i18n";
import { buzz } from "@/lib/feel";

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

/** The logo, and the language switch for guests whose phone speaks the other one */
function Brand() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center justify-between">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <img src="/mark.svg" alt="" className="h-6 w-6" /> Glacify
      </Link>
      <div className="flex rounded-full bg-surface p-0.5 text-[12px] font-semibold" role="radiogroup" aria-label="Langue / Language">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={l.code === lang}
            aria-label={l.name}
            onClick={() => setLang(l.code)}
            className={`rounded-full px-2.5 py-1 uppercase transition ${l.code === lang ? "bg-canvas text-ink shadow-soft" : "text-muted"}`}
          >
            {l.code}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Public page of a round (/t/<code>): anyone with the link picks their ice
 * cream on their own phone, no account. The host sees it arrive live.
 */
export default function GuestOrder() {
  const { t, tn } = useI18n();
  const code = (useParams().code ?? "").toUpperCase();
  const [token, setToken] = useState(() => read(tokenKey(code)));
  const [composing, setComposing] = useState<Composing>(null);

  const { data, isLoading, error } = trpc.guest.round.useQuery(
    { code, token },
    { retry: false, refetchInterval: composing ? false : 5000 },
  );
  const utils = trpc.useUtils();
  const refresh = () => utils.guest.round.invalidate();
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const place = trpc.guest.placeOrder.useMutation({
    onSuccess: (res) => {
      buzz("success");
      setJustPlaced(res.id);
      write(tokenKey(code), res.token);
      setToken(res.token);
      setComposing(null);
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: showError,
  });
  const update = trpc.guest.updateOrder.useMutation({
    onSuccess: () => (setComposing(null), refresh(), toast.success(t("orderUpdated"))),
    onError: showError,
  });
  const cancel = trpc.guest.cancelOrder.useMutation({ onSuccess: refresh, onError: showError });

  // The host hands an ice cream over: its owner's phone celebrates
  type Mine = NonNullable<typeof data>["mine"][number];
  const [ready, setReady] = useState<Mine | null>(null);
  const servedSeen = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!data) return;
    const served = data.mine.filter((o) => o.servedAt);
    const fresh = servedSeen.current && served.find((o) => !servedSeen.current!.has(o.id));
    if (fresh) {
      setReady(fresh);
      buzz("success");
    }
    servedSeen.current = new Set(served.map((o) => o.id));
  }, [data]);

  if (isLoading) return null;
  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <EmptyArt kind="lost" />
        <h1 className="mt-6 font-display text-2xl font-bold">{t("linkNotFoundTitle")}</h1>
        <p className="mt-2 text-muted">{t("linkNotFoundText")}</p>
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
    if (!input.name) return toast.error(t("enterName"));
    if (mine.length === 0) write(NAME_KEY, input.name);
    if (composing?.id && token) update.mutate({ code, token, id: composing.id, order: input });
    else place.mutate({ code, token, order: input });
  };

  return (
    <div className="mx-auto max-w-lg px-5 pb-[calc(110px+var(--safe-bottom))] pt-6">
      <div className="page-in">
        <Brand />
        <p className="eyebrow mb-1.5 mt-6">{t("hostServes", { name: data.hostName })}</p>
        <h1 className="title">{data.title}</h1>
      </div>

      {!data.open && (
        <div className="card mt-6 flex flex-col items-center p-6 text-center">
          <EmptyArt kind="closed" size={120} />
          <p className="mt-3 font-display text-lg font-bold">{t("ordersClosed")}</p>
          <p className="mt-1 text-sm text-muted">{t("ordersClosedText", { name: data.hostName })}</p>
        </div>
      )}

      {mine.length > 0 && !composing && (
        <section className="mt-7 space-y-2.5">
          <h2 className="eyebrow px-1">{tn("yourIce", mine.length)}</h2>
          {mine.map((o) => {
            const served = !!o.servedAt;
            return (
              <div
                key={o.id}
                className={`flex items-center gap-4 rounded-3xl p-4 pop:border-[3px] pop:border-ink ${o.id === justPlaced ? "pop-in" : "page-in"} ${served ? "bg-pistache/10 pop:bg-mint" : "bg-surface pop:bg-canvas"}`}
              >
                <div className={`flex w-14 flex-none justify-center ${served ? "" : "wobble"}`}>
                  <IceCream kind={l.container(o.containerId).kind} colors={o.scoops.map((id) => l.flavor(id))} size={50} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">{o.name}</p>
                  <p className="text-sm leading-snug text-muted">{describeOrder(menu, o)}</p>
                  <p className={`mt-1.5 flex items-center gap-1 text-sm font-semibold ${served ? "text-pistache" : "text-ink"}`}>
                    {served ? (
                      <>
                        <Check size={16} strokeWidth={3} /> {t("servedEnjoy")}
                      </>
                    ) : (
                      <>
                        <span className="relative mr-1 flex h-2.5 w-2.5" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                        </span>
                        {t("beingPrepared", { name: data.hostName })}
                      </>
                    )}
                  </p>
                </div>
                {data.open && !served && (
                  <div className="flex flex-none flex-col">
                    <button className="icon-btn h-10 w-10" aria-label={t("edit")} onClick={() => {
                        refresh();
                        setComposing({ id: o.id, draft: toDraft(o) });
                      }}>
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-btn h-10 w-10 hover:text-danger"
                      aria-label={t("cancelThisIce")}
                      onClick={async () => {
                        if (token && (await confirmDialog({ title: t("cancelIceConfirm"), confirmLabel: t("cancelIceOk"), danger: true })))
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
              <Plus size={18} /> {t("addAnother")}
            </button>
          )}
        </section>
      )}

      {showForm && (
        <section className="page-in mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold">{composing?.id ? t("editIce") : t("chooseIce")}</h2>
            {composing && mine.length > 0 && (
              <button className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setComposing(null)}>
                {t("cancel")}
              </button>
            )}
          </div>
          <OrderForm menu={menu} draft={draft} onChange={setDraft} guest nameLabel={mine.length === 0 ? t("yourFirstName") : t("forWhom")} />
        </section>
      )}

      {others.length > 0 && !composing && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2.5 px-1">{t("alreadyOrdered")}</h2>
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

      {ready && (
        <div
          className="fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas px-8 text-center pop:bg-mint"
          role="dialog"
          aria-modal="true"
          aria-label={t("iceReadyTitle", { name: ready.name })}
        >
          <div className="pop-in relative">
            <Confetti colors={[...ready.scoops.map((id) => l.flavor(id).color), "rgb(var(--accent))", "rgb(var(--sun))", "rgb(var(--lilac))"]} />
            <IceCream kind={l.container(ready.containerId).kind} colors={ready.scoops.map((id) => l.flavor(id))} size={120} />
          </div>
          <h2 className="title mt-8">{t("iceReadyTitle", { name: ready.name })}</h2>
          <p className="mt-2 text-[16px] text-muted pop:font-bold pop:text-ink/75">{t("iceReadyText", { name: data.hostName })}</p>
          <button className="btn-ink mt-8 w-full max-w-xs py-4 text-base" onClick={() => setReady(null)}>
            {t("thanks")}
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[max(1rem,var(--safe-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto max-w-lg px-5">
            <button className="btn-ink w-full py-4 text-base" disabled={draft.scoops.length === 0 || place.isPending || update.isPending} onClick={submit}>
              {composing?.id ? t("save") : draft.scoops.length === 0 ? t("chooseFlavorFirst") : t("sendOrder")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
