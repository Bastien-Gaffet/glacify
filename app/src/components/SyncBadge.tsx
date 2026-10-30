import { useEffect } from "react";
import { CloudUpload, WifiOff } from "lucide-react";
import { useSyncStatus } from "@/lib/offline/sync";
import { useI18n } from "@/lib/i18n";

/**
 * A small pill at the top while the app is offline or still has changes to
 * send: the host knows nothing is lost, and when it is all sent.
 */
export function SyncBadge() {
  const { t, tn } = useI18n();
  const { online, waiting } = useSyncStatus();
  const shown = !online || waiting > 0;
  // The pages make room for it at the top (--sync-gap) instead of being covered
  useEffect(() => {
    document.documentElement.style.setProperty("--sync-gap", shown ? "40px" : "0px");
  }, [shown]);
  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+8px)] z-[70] flex justify-center px-4">
      <p
        role="status"
        className="pop-in flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-onink shadow-soft pop:border-[2.5px] pop:border-ink pop:bg-lemon pop:text-ink pop:shadow-none"
      >
        {online ? <CloudUpload size={15} strokeWidth={2.4} /> : <WifiOff size={15} strokeWidth={2.4} />}
        {online ? t("syncing") : t("offline")}
        {waiting > 0 && <span className="font-normal opacity-80 pop:font-bold">· {tn("waitingChanges", waiting)}</span>}
      </p>
    </div>
  );
}
