import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

type Request = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

let show: ((r: Request) => void) | null = null;

/**
 * In-app replacement for window.confirm (whose system pop-up clashes with
 * the app). Resolves true when confirmed. Needs <ConfirmHost /> mounted once.
 */
export function confirmDialog(opts: Omit<Request, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(false);
    show({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const { t } = useI18n();
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    show = setReq;
    return () => {
      show = null;
    };
  }, []);
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!req) return null;
  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-label={req.title}>
      <div className="fade-in absolute inset-0 bg-ink/40" onClick={() => close(false)} />
      <div className="page-in relative w-full max-w-sm rounded-[28px] bg-canvas p-6 shadow-2xl">
        <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight">{req.title}</h2>
        {req.message && <div className="mt-2 text-[15px] text-muted">{req.message}</div>}
        <div className="mt-6 flex gap-2">
          <button className="btn-soft flex-1" onClick={() => close(false)}>
            {t("cancel")}
          </button>
          <button className={`${req.danger ? "btn bg-danger text-white hover:bg-danger/90" : "btn-ink"} flex-1`} onClick={() => close(true)} autoFocus>
            {req.confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
