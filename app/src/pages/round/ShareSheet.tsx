import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Copy, Share2, WifiOff } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useI18n } from "@/lib/i18n";

export function guestLink(code: string) {
  return `${window.location.origin}/t/${code}`;
}

/** The round's public link: QR code to scan at the table, or sent to the group. */
export function ShareSheet({ open, onClose, code, title }: { open: boolean; onClose: () => void; code: string; title: string }) {
  const { t } = useI18n();
  const link = guestLink(code);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#181513", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, link]);

  const text = t("shareText", { title });
  const share = async () => {
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title, text, url: link });
      else if (navigator.share) await navigator.share({ title, text, url: link });
      else await copy();
    } catch {
      /* closed by the user */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("groupOrder")}>
      {/* A round created offline has no link until the server knows it */}
      {!code ? (
        <div className="flex flex-col items-center py-6 text-center">
          <WifiOff size={34} className="text-muted" />
          <p className="mt-3 text-[15px] text-muted">{t("linkWhenOnline")}</p>
        </div>
      ) : (
        <>
          <p className="text-[15px] text-muted">{t("shareIntro")}</p>
          <div className="mx-auto my-5 w-full max-w-[240px] rounded-3xl border border-line bg-white p-4">
            {qr ? <img src={qr} alt={t("qrAlt")} className="aspect-square w-full" /> : <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface" />}
          </div>
          <p className="mb-4 select-all break-all text-center text-sm text-muted">{link}</p>
          <div className="flex gap-2">
            <button className="btn-soft flex-1" onClick={copy}>
              <Copy size={17} /> {t("copy")}
            </button>
            <button className="btn-ink flex-1" onClick={share}>
              <Share2 size={17} /> {t("send")}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
