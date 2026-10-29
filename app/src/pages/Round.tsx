import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Lock, LockOpen, MoreHorizontal, Pencil, QrCode, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Sheet } from "@/components/Sheet";
import { confirmDialog } from "@/components/Confirm";
import { MenuGroup, MenuRow } from "@/components/menu";
import { showError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { Orders } from "./round/Orders";
import { Service } from "./round/Service";
import { ShareSheet } from "./round/ShareSheet";
import { OrderSheet, type EditTarget } from "./round/OrderSheet";

type View = "orders" | "service";

export default function Round() {
  const { t, tn } = useI18n();
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = params.get("vue") === "service" ? "service" : "orders";
  // Each view starts at its top: the service begins with its first step
  const setView = (v: View) => {
    setParams(v === "service" ? { vue: "service" } : {}, { replace: true });
    window.scrollTo({ top: 0 });
  };
  // The full-screen service has its own history entry: "back" closes it
  const mode = view === "service" && params.get("etapes") === "1";
  const setMode = (open: boolean) =>
    open ? setParams({ vue: "service", etapes: "1" }) : setParams({ vue: "service" }, { replace: true });

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [sharing, setSharing] = useState(false);
  const [actions, setActions] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Guests' orders arrive live while the round is open
  const { data, isLoading, error } = trpc.rounds.get.useQuery(
    { id },
    { refetchInterval: (q) => (q.state.data?.round.status === "open" && !editing ? 4000 : false), retry: false },
  );
  const utils = trpc.useUtils();
  const refresh = () => {
    utils.rounds.get.invalidate({ id });
    utils.rounds.list.invalidate();
  };
  const setStatus = trpc.rounds.setStatus.useMutation({ onSuccess: refresh, onError: showError });
  const rename = trpc.rounds.rename.useMutation({ onSuccess: () => (refresh(), setRenaming(null)), onError: showError });
  const remove = trpc.rounds.remove.useMutation({
    onSuccess: () => {
      utils.rounds.list.invalidate();
      navigate("/", { replace: true });
      toast.success(t("roundDeleted"));
    },
    onError: showError,
  });

  if (isLoading) return null;
  if (error || !data) {
    return (
      <div className="page-in">
        <PageHeader back="/" title={t("roundNotFound")} />
      </div>
    );
  }

  const { round, orders } = data;
  const open = round.status === "open";
  const close = () => setStatus.mutate({ id, status: "closed" }, { onSuccess: () => toast.success(t("roundClosed")) });

  return (
    <div className="page-in">
      <PageHeader
        back="/"
        title={round.title}
        actions={
          <>
            {open && (
              <button className="icon-btn text-ink" onClick={() => setSharing(true)} aria-label={t("groupOrder")}>
                <QrCode size={21} />
              </button>
            )}
            <button className="icon-btn text-ink" onClick={() => setActions(true)} aria-label={t("moreActions")}>
              <MoreHorizontal size={22} />
            </button>
          </>
        }
      >
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <span className={`chip px-2.5 py-1 text-[12px] font-semibold ${open ? "bg-pistache/15 text-pistache" : "bg-surface text-muted"}`}>
            {open ? t("ordersOpen") : t("closedChip")}
          </span>
          {orders.length > 0 && tn("ices", orders.length)}
        </p>
      </PageHeader>

      <div className="mb-6">
        <Segmented
          label={t("view")}
          value={view}
          onChange={setView}
          options={[
            { value: "orders", label: t("ordersTab") },
            { value: "service", label: t("serviceTab") },
          ]}
        />
      </div>

      {view === "orders" ? (
        <Orders data={data} onEdit={setEditing} onShare={() => setSharing(true)} onService={() => setView("service")} />
      ) : (
        <Service data={data} onClose={close} mode={mode} onMode={setMode} />
      )}

      <OrderSheet roundId={id} menu={data.menu} target={editing} count={orders.length} onClose={() => setEditing(null)} />
      <ShareSheet open={sharing} onClose={() => setSharing(false)} code={round.code} title={round.title} />

      <Sheet open={actions} onClose={() => setActions(false)} title={round.title}>
        <MenuGroup>
          <MenuRow
            icon={Pencil}
            label={t("rename")}
            onClick={() => {
              setActions(false);
              setRenaming(round.title);
            }}
          />
          {open ? (
            <MenuRow
              icon={Lock}
              label={t("closeOrders")}
              value={t("closeOrdersSub")}
              onClick={() => {
                setActions(false);
                close();
              }}
            />
          ) : (
            <MenuRow
              icon={LockOpen}
              label={t("reopenOrders")}
              onClick={() => {
                setActions(false);
                setStatus.mutate({ id, status: "open" });
              }}
            />
          )}
          <MenuRow
            icon={Trash2}
            label={t("deleteRound")}
            danger
            onClick={async () => {
              setActions(false);
              if (
                await confirmDialog({
                  title: t("deleteRoundConfirm"),
                  message: t("deleteRoundMsg"),
                  confirmLabel: t("delete"),
                  danger: true,
                })
              )
                remove.mutate({ id });
            }}
          />
        </MenuGroup>
      </Sheet>

      <Sheet
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={t("rename")}
        footer={
          <button className="btn-ink w-full py-4" disabled={!renaming?.trim() || rename.isPending} onClick={() => rename.mutate({ id, title: renaming!.trim() })}>
            {t("save")}
          </button>
        }
      >
        <input
          className="field"
          value={renaming ?? ""}
          onChange={(e) => setRenaming(e.target.value)}
          maxLength={80}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && renaming?.trim() && rename.mutate({ id, title: renaming.trim() })}
        />
      </Sheet>
    </div>
  );
}
