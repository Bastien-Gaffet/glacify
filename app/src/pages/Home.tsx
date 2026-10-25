import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, Plus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Sheet } from "@/components/Sheet";
import { IceCream } from "@/components/IceCream";
import { showError } from "@/lib/errors";
import { plural, shortDate } from "@/lib/format";

const IDEAS = ["Goûter", "Soirée", "Dimanche en famille", "Anniversaire", "Après la plage"];

type RoundSummary = {
  id: number;
  title: string;
  status: "open" | "closed";
  createdAt: Date;
  orders: number;
  served: number;
  scoops: number;
};

function RoundCard({ r }: { r: RoundSummary }) {
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
            ? "Aucune commande pour l'instant"
            : `${plural(r.orders, "glace")} · ${plural(r.scoops, "boule")}${done ? " · tout est servi" : r.served ? ` · ${r.served} servie${r.served > 1 ? "s" : ""}` : ""}`}
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
    create.mutate({ title: title.trim() || "Tournée de glaces" });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nouvelle tournée"
      footer={
        <button className="btn-ink w-full py-4" onClick={() => submit()} disabled={create.isPending}>
          Créer la tournée
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[15px] text-muted">Une tournée, c'est un service : le goûter, une soirée, un après-midi au stand.</p>
        <div>
          <label className="label" htmlFor="round-title">
            Nom
          </label>
          <input id="round-title" className="field" placeholder="Goûter du dimanche" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => setTitle(idea)} className="chip border border-line bg-canvas py-2 text-[14px] hover:border-ink/30">
              {idea}
            </button>
          ))}
        </div>
      </form>
    </Sheet>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data: rounds, isLoading } = trpc.rounds.list.useQuery();
  const open = rounds?.filter((r) => r.status === "open") ?? [];
  const closed = rounds?.filter((r) => r.status === "closed") ?? [];
  const firstName = user?.name && user.name !== "Glacier" ? user.name.split(" ")[0] : null;

  return (
    <div className="page-in">
      <header className="mb-6">
        <p className="eyebrow mb-1.5">{firstName ? `Bonjour ${firstName}` : "Bonjour"}</p>
        <h1 className="title">Vos tournées</h1>
      </header>

      <button
        onClick={() => setCreating(true)}
        className="group relative mb-8 flex w-full items-center gap-4 overflow-hidden rounded-[28px] bg-ink p-5 text-left text-onink transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-tight">Nouvelle tournée</p>
          <p className="mt-1 text-[14px] text-onink/70">Partagez un lien, chacun choisit sa glace.</p>
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
          <h2 className="mt-5 font-display text-xl font-bold">Prêt à servir</h2>
          <p className="mt-1.5 max-w-xs text-[15px] text-muted">
            Créez une tournée, envoyez le lien au groupe ou prenez les commandes vous-même. Glacify prépare l'ordre de service.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2.5 px-1">En cours</h2>
              <div className="stagger space-y-2.5">
                {open.map((r) => (
                  <RoundCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2.5 px-1">Historique</h2>
              <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line">
                {closed.map((r) => (
                  <Link key={r.id} to={`/r/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-sunken/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="text-sm text-muted">
                        {shortDate(r.createdAt)} · {plural(r.orders, "glace")}
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
