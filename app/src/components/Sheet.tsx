import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Bottom sheet on phones, centred dialog on wider screens. `footer` stays
 * pinned under the scrolling content (the main action is always in reach).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll along with the sheet
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade-in absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="sheet-up relative flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-2xl sm:rounded-[28px] pop:rounded-t-[34px] pop:border-[3px] pop:border-b-0 pop:border-ink sm:pop:rounded-[34px] sm:pop:border-b-[3px]">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="font-display text-[22px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="icon-btn -mr-2" aria-label={t("close")}>
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-[max(1rem,var(--safe-bottom))] pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
