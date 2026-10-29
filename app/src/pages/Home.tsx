import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, Plus, QrCode } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Sheet } from "@/components/Sheet";
import { IceCream } from "@/components/IceCream";
import { PatternOverlay } from "@/components/FlavorPattern";
import { ShareSheet } from "@/pages/round/ShareSheet";
import { showError } from "@/lib/errors";
import { initials, shortDate } from "@/lib/format";
import { useI18n, type TKey } from "@/lib/i18n";
import { usePop } from "@/lib/style";

const IDEAS: TKey[] = ["idea1", "idea2", "idea3", "idea4", "idea5"];

type RoundSummary = {
  id: number;
  title: string;
  code: string;
  status: "open" | "closed";
  createdAt: Date;
  orders: number;
  served: number;
  scoops: number;
};

function RoundCard({ r }: { r: RoundSummary }) {
  const { t, tn } = useI18n();
  const open = r.status === "open";
  const done = r.orders > 0 && r.served === r.orders;
  return (
    <Link to={`/r/${r.id}`} className="card flex items-center gap-4 p-4 transition hover:bg-sunken/70 active:scale-[0.99]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {open && <span className="h-2 w-2 flex-none rounded-full bg-pistache" aria-hidden />}
          <h3 className="truncate font-display text-[19px] font-bold">{r.title}</h3>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {r.orders === 0
            ? t("noOrdersYet")
            : [tn("ices", r.orders), tn("scoops", r.scoops), done ? t("roundAllServed") : r.served ? tn("servedCount", r.served) : ""]
                .filter(Boolean)
                .join(" · ")}
        </p>
        {open && r.orders > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-pistache transition-all" style={{ width: `${(r.served / r.orders) * 100}%` }} />
          </div>
        )}
      </div>
      <ChevronRight size={20} className="flex-none text-muted" />
    </Link>
  );
}

function NewRoundSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const create = trpc.rounds.create.useMutation({
    onSuccess: ({ id }) => {
      utils.rounds.list.invalidate();
      onClose();
      setTitle("");
      navigate(`/r/${id}`);
    },
    onError: showError,
  });
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    create.mutate({ title: title.trim() || t("defaultRoundTitle") });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("newRound")}
      footer={
        <button className="btn-ink w-full py-4" onClick={() => submit()} disabled={create.isPending}>
          {t("createRound")}
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[15px] text-muted">{t("roundIntro")}</p>
        <div>
          <label className="label" htmlFor="round-title">
            {t("name")}
          </label>
          <input id="round-title" className="field" placeholder={t("roundPlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => setTitle(t(idea))} className="chip border border-line bg-canvas py-2 text-[14px] hover:border-ink/30">
              {t(idea)}
            </button>
          ))}
        </div>
      </form>
    </Sheet>
  );
}

export default function Home() {
  return usePop() ? <PopHome /> : <PlainHome />;
}

// Tiles of the display case lean a little, each its own way
const TILTS = [-3, 2, -1, 3, 1, -2, 2, -3];

/** Pop look: colour blocks, the open rounds with their QR code, the display case */
function PopHome() {
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState<RoundSummary | null>(null);
  const { data: rounds, isLoading } = trpc.rounds.list.useQuery();
  const { data: menu } = trpc.menu.get.useQuery();
  const open = rounds?.filter((r) => r.status === "open") ?? [];
  const closed = rounds?.filter((r) => r.status === "closed") ?? [];
  const firstName = user?.name && user.name !== "Glacier" ? user.name.split(" ")[0] : null;
  const flavors = menu?.flavors.filter((f) => f.available) ?? [];

  return (
    <div className="page-in space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{firstName ? t("helloName", { name: firstName }) : t("hello")}</p>
          <h1 className="title">{t("yourRounds")}</h1>
        </div>
        {user && (
          <Link
            to="/moi"
            aria-label={t("navMe")}
            className="flex h-12 w-12 flex-none rotate-6 items-center justify-center rounded-2xl border-[3px] border-ink bg-lilac font-display text-[20px] font-bold transition active:rotate-0"
          >
            {initials(user.name)}
          </Link>
        )}
      </header>

      <button
        onClick={() => setCreating(true)}
        className="relative block w-full overflow-hidden rounded-[34px] border-[3px] border-ink bg-sun p-[22px] text-left transition active:translate-y-[2px]"
      >
        <span className="block max-w-[190px] font-display text-[30px] font-bold leading-none">{t("newRound")}</span>
        <span className="mt-2 block max-w-[180px] text-[15px] font-bold">{t("newRoundPop")}</span>
        <span className="mt-[18px] inline-flex rounded-full border-[3px] border-ink bg-accent px-5 py-2 font-display text-[17px] font-semibold text-onaccent shadow-pop">
          {t("letsGo")}
        </span>
        <svg viewBox="0 0 120 170" width="128" height="182" aria-hidden="true" className="absolute -bottom-[46px] -right-1 rotate-12">
          <circle cx="60" cy="30" r="26" fill="#F29BB0" stroke="rgb(var(--ink))" strokeWidth="4" />
          <circle cx="60" cy="56" r="28" fill="#9FE0C8" stroke="rgb(var(--ink))" strokeWidth="4" />
          <g fill="#3E2A22">
            <rect x="48" y="50" width="9" height="4" rx="2" transform="rotate(-20 52 52)" />
            <rect x="66" y="60" width="9" height="4" rx="2" transform="rotate(30 70 62)" />
          </g>
          <path d="M30 70 L60 160 L90 70 Z" fill="#F2C46B" stroke="rgb(var(--ink))" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </button>

      {!isLoading && rounds?.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-8 text-center">
          <div className="flex items-end gap-1">
            <IceCream kind="cone" colors={["#F2E3B3", "#F29BB0"]} size={52} />
            <IceCream kind="cup" colors={["#A9CF8A", "#6B3F2A", "#F5E06A"]} size={60} />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold">{t("readyTitle")}</h2>
          <p className="mt-1.5 max-w-xs text-[15px] text-muted">{t("readyText")}</p>
        </div>
      )}

      {open.length > 0 && (
        <div className="stagger space-y-3">
          {open.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <Link
                to={`/r/${r.id}`}
                className="flex min-w-0 flex-1 flex-col gap-2 rounded-[28px] border-[3px] border-ink bg-mint p-4 transition active:translate-y-[2px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-display text-[19px] font-bold leading-tight">{r.title}</p>
                  <span className="flex-none rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-extrabold uppercase">{t("inProgress")}</span>
                </div>
                <p className="text-[13px] font-bold">
                  {r.orders === 0
                    ? t("noOrdersYet")
                    : `${tn("ices", r.orders)} · ${r.served === r.orders ? t("roundAllServed") : tn("servedCount", r.served)}`}
                </p>
                <div className="h-2.5 rounded-full bg-ink/15" aria-hidden="true">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${r.orders ? (r.served / r.orders) * 100 : 0}%` }} />
                </div>
              </Link>
              <button
                onClick={() => setSharing(r)}
                aria-label={t("qrOf", { title: r.title })}
                className="flex w-[92px] flex-none flex-col items-center justify-center gap-1.5 rounded-[28px] border-[3px] border-ink bg-lemon font-display text-[14px] font-semibold transition active:translate-y-[2px]"
              >
                <QrCode size={32} strokeWidth={2} />
                {t("qrCode")}
              </button>
            </div>
          ))}
        </div>
      )}

      {menu && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[22px] font-bold">{t("showcase")}</h2>
            <Link to="/carte" className="text-[14px] font-extrabold underline underline-offset-[3px]">
              {t("navMenu")}
            </Link>
          </div>
          {flavors.length === 0 ? (
            <p className="text-[15px] text-muted">{t("showcaseEmpty")}</p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2.5 gap-y-3.5">
              {flavors.map((f, i) => (
                <div key={f.id} className="flex min-w-0 flex-col items-center gap-1.5">
                  <span
                    className="relative aspect-square w-full max-w-[66px] overflow-hidden rounded-[20px] border-[3px] border-ink"
                    style={{ background: f.color, rotate: `${TILTS[i % TILTS.length]}deg` }}
                  >
                    <PatternOverlay look={f} />
                  </span>
                  <span className="w-full truncate text-center text-[12px] font-extrabold">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-[22px] font-bold">{t("history")}</h2>
          <div className="card overflow-hidden [&>*+*]:border-t-2 [&>*+*]:border-ink/10">
            {closed.map((r) => (
              <Link key={r.id} to={`/r/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[17px] font-semibold">{r.title}</p>
                  <p className="text-sm font-semibold text-muted">
                    {shortDate(r.createdAt)} · {tn("ices", r.orders)}
                  </p>
                </div>
                <ChevronRight size={18} className="flex-none text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <NewRoundSheet open={creating} onClose={() => setCreating(false)} />
      {sharing && <ShareSheet open onClose={() => setSharing(null)} code={sharing.code} title={sharing.title} />}
    </div>
  );
}

function PlainHome() {
  const { t, tn } = useI18n();

  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data: rounds, isLoading } = trpc.rounds.list.useQuery();
  const open = rounds?.filter((r) => r.status === "open") ?? [];
  const closed = rounds?.filter((r) => r.status === "closed") ?? [];
  const firstName = user?.name && user.name !== "Glacier" ? user.name.split(" ")[0] : null;

  return (
    <div className="page-in">
      <header className="mb-6">
        <p className="eyebrow mb-1.5">{firstName ? t("helloName", { name: firstName }) : t("hello")}</p>
        <h1 className="title">{t("yourRounds")}</h1>
      </header>

      <button
        onClick={() => setCreating(true)}
        className="group relative mb-8 flex w-full items-center gap-4 overflow-hidden rounded-[28px] bg-ink p-5 text-left text-onink transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-tight">{t("newRound")}</p>
          <p className="mt-1 text-[14px] text-onink/70">{t("newRoundSub")}</p>
        </div>
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-onink text-ink transition group-hover:scale-105">
          <Plus size={24} />
        </span>
      </button>

      {isLoading ? null : rounds?.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <div className="flex items-end gap-1">
            <IceCream kind="cone" colors={["#F2E3B3", "#F29BB0"]} size={52} />
            <IceCream kind="cup" colors={["#A9CF8A", "#6B3F2A", "#F5E06A"]} size={60} />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold">{t("readyTitle")}</h2>
          <p className="mt-1.5 max-w-xs text-[15px] text-muted">
            {t("readyText")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2.5 px-1">{t("inProgress")}</h2>
              <div className="stagger space-y-2.5">
                {open.map((r) => (
                  <RoundCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2.5 px-1">{t("history")}</h2>
              <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line">
                {closed.map((r) => (
                  <Link key={r.id} to={`/r/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-sunken/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="text-sm text-muted">
                        {shortDate(r.createdAt)} · {tn("ices", r.orders)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="flex-none text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <NewRoundSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
