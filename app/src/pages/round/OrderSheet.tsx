import { useEffect, useState } from "react";
import type { Menu } from "@contracts/menu";
import { Sheet } from "@/components/Sheet";
import { OrderForm, draftToInput, emptyDraft, toDraft, type Draft } from "@/components/OrderForm";
import { trpc } from "@/providers/trpc";
import { showError } from "@/lib/errors";

export type EditTarget =
  | { mode: "new"; from?: Omit<Draft, "name"> }
  | { mode: "edit"; order: { id: number; name: string; containerId: number; scoops: number[]; toppings: number[]; note: string | null } };

/** The host takes (or changes) an order for someone at the table. */
export function OrderSheet({
  roundId,
  menu,
  target,
  count,
  onClose,
}: {
  roundId: number;
  menu: Menu;
  target: EditTarget | null;
  /** Orders already in the round, to name an anonymous one "Glace n" */
  count: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(menu));
  useEffect(() => {
    if (!target) return;
    if (target.mode === "edit") setDraft(toDraft(target.order));
    else setDraft(target.from ? { ...target.from, name: "" } : emptyDraft(menu));
    // Only when the sheet opens on a new target, not on every refetch of the menu
  }, [target]);

  const utils = trpc.useUtils();
  const save = trpc.rounds.saveOrder.useMutation({
    onSuccess: () => {
      utils.rounds.get.invalidate({ id: roundId });
      onClose();
    },
    onError: showError,
  });
  const editing = target?.mode === "edit";
  const submit = () =>
    save.mutate({
      roundId,
      id: editing ? target.order.id : undefined,
      ...draftToInput(draft, `Glace ${count + 1}`),
    });

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={editing ? "Modifier la glace" : "Nouvelle glace"}
      footer={
        <button className="btn-ink w-full py-4" disabled={draft.scoops.length === 0 || save.isPending} onClick={submit}>
          {editing ? "Enregistrer" : "Ajouter à la commande"}
        </button>
      }
    >
      {target && <OrderForm menu={menu} draft={draft} onChange={setDraft} autoFocusName={!editing && !target.from} />}
    </Sheet>
  );
}
