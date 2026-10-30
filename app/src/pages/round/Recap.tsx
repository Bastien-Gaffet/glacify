import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import { Share2, X } from "lucide-react";
import { clsx } from "clsx";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { buildPlan } from "@contracts/plan";
import type { Flavor } from "@contracts/menu";
import { renderToStaticMarkup } from "react-dom/server";
import { PatternMarks, PatternOverlay } from "@/components/FlavorPattern";
import { useI18n, type Translator } from "@/lib/i18n";
import { usePop } from "@/lib/style";
import { buzz } from "@/lib/feel";
import { play } from "@/lib/sound";
import type { RoundData } from "./types";

type Podium = { flavor: Flavor; count: number }[];

/** What the summary shows: the three most ordered flavors and the round in numbers */
function summary(data: RoundData, removed: string) {
  const plan = buildPlan(data.orders, data.menu, removed);
  const podium: Podium = [...plan.totals].sort((a, b) => b.count - a.count).slice(0, 3);
  const served = data.orders.map((o) => o.servedAt).filter((d): d is Date => !!d).map((d) => new Date(d).getTime());
  // From the first ice cream handed over to the last
  const minutes = served.length > 1 ? Math.round((Math.max(...served) - Math.min(...served)) / 60000) : null;
  return { podium, ices: plan.orders.length, scoops: plan.scoopCount, minutes };
}

function duration(L: Translator, minutes: number) {
  if (minutes < 1) return L.t("lessThanMinute");
  if (minutes < 60) return L.t("durationMin", { n: minutes });
  return L.t("durationHours", { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, "0") });
}

// Second, first, third: the winner stands in the middle, highest
const PLACES = [1, 0, 2];
const STEP_HEIGHT = [112, 80, 58];
const STEP_COLOR = ["bg-sun", "bg-accent text-onaccent", "bg-mint"];
// Pop: each flavor sticker leans its own way, like the display case
const TILT = [-6, 5, -4];
// The numbers, in the Moi screen's colour tiles
const STAT_COLOR = ["pop:bg-sun", "pop:bg-mint", "pop:bg-lilac"];

function PodiumView({ podium }: { podium: Podium }) {
  const { tn } = useI18n();
  const pop = usePop();
  return (
    <div className="flex items-end justify-center gap-2.5">
      {PLACES.filter((p) => podium[p]).map((p) => {
        const { flavor, count } = podium[p]!;
        return (
          <div key={flavor.id} className="flex w-[30%] max-w-[120px] flex-col items-center">
            <motion.span
              className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border-[3px] border-ink pop:rounded-[20px]"
              style={{ background: flavor.color }}
              initial={{ y: -160, opacity: 0, rotate: -30 }}
              animate={{ y: 0, opacity: 1, rotate: pop ? TILT[p] : 0 }}
              transition={{ delay: 0.25 + (2 - p) * 0.22, type: "spring", stiffness: 380, damping: 14 }}
            >
              <PatternOverlay look={flavor} />
            </motion.span>
            <p className="w-full truncate text-center font-display text-[15px] font-bold leading-tight">{flavor.name}</p>
            <p className="mb-2 text-[12px] font-semibold text-muted pop:font-extrabold pop:text-ink">{tn("scoops", count)}</p>
            <motion.div
              className={clsx(
                "flex w-full items-start justify-center rounded-t-2xl border-[3px] border-b-0 border-ink pt-2 font-display text-[28px] font-bold",
                STEP_COLOR[p],
              )}
              style={{ height: STEP_HEIGHT[p], transformOrigin: "bottom" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.05 + (2 - p) * 0.12, type: "spring", stiffness: 260, damping: 22 }}
            >
              {p + 1}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/** rgb(var(--x)) for the canvas, which cannot read CSS variables */
const token = (name: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).join(",")})`;

/** A flavor's colour and pattern as a picture, for the canvas */
function flavorPicture(flavor: Flavor) {
  const marks = renderToStaticMarkup(<PatternMarks pattern={flavor.pattern} accent={flavor.accent} />);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${flavor.color}"/>${marks}</svg>`;
  return new Promise<HTMLImageElement>((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = ko;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** The summary as a picture (1080×1350), to send to the group */
async function recapImage(L: Translator, title: string, s: ReturnType<typeof summary>) {
  await document.fonts.ready;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const ink = token("ink");
  g.fillStyle = token("lilac");
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#FFFFFF";
  g.strokeStyle = ink;
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(60, 60, W - 120, H - 120, 70);
  g.fill();
  g.stroke();

  g.fillStyle = ink;
  g.textAlign = "center";
  g.font = `700 44px ${display}`;
  g.fillText(L.t("recapTitle"), W / 2, 175);
  g.font = `700 78px ${display}`;
  const name = title.length > 22 ? `${title.slice(0, 21)}…` : title;
  g.fillText(name, W / 2, 270);

  // Podium
  const base = 900;
  const cols = [W / 2 - 290, W / 2, W / 2 + 290];
  const heights = [260, 190, 140];
  const fills = [token("sun"), token("accent"), token("mint")];
  for (const p of PLACES) {
    const item = s.podium[p];
    if (!item) continue;
    const x = cols[PLACES.indexOf(p)]!;
    const h = heights[p]!;
    g.fillStyle = fills[p]!;
    g.beginPath();
    g.roundRect(x - 120, base - h, 240, h, [36, 36, 0, 0]);
    g.fill();
    g.stroke();
    g.fillStyle = p === 1 ? "#FFFFFF" : ink;
    g.font = `700 80px ${display}`;
    g.fillText(String(p + 1), x, base - h + 95);
    // The flavor as a sticker: a rounded square with its pattern, leaning like on screen
    const picture = await flavorPicture(item.flavor);
    g.save();
    g.translate(x, base - h - 190);
    g.rotate((TILT[p]! * Math.PI) / 180);
    g.beginPath();
    g.roundRect(-80, -80, 160, 160, 48);
    g.save();
    g.clip();
    g.drawImage(picture, -80, -80, 160, 160);
    g.restore();
    g.stroke();
    g.restore();
    g.fillStyle = ink;
    g.font = `700 40px ${display}`;
    const label = item.flavor.name.length > 14 ? `${item.flavor.name.slice(0, 13)}…` : item.flavor.name;
    g.fillText(label, x, base - h - 60);
    g.font = `600 30px ${display}`;
    g.fillText(L.tn("scoops", item.count), x, base - h - 20);
  }
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(110, base);
  g.lineTo(W - 110, base);
  g.stroke();

  // Numbers, in colour tiles
  const stats: [string, string][] = [
    [String(s.ices), L.tn("iceWord", s.ices)],
    [String(s.scoops), L.tn("scoopWord", s.scoops)],
  ];
  if (s.minutes !== null) stats.push([duration(L, s.minutes), L.t("ofService")]);
  const tileW = 270;
  const gap = 30;
  const left = (W - (stats.length * tileW + (stats.length - 1) * gap)) / 2;
  const tiles = [token("sun"), token("mint"), token("lilac")];
  stats.forEach(([n, label], i) => {
    const tx = left + i * (tileW + gap);
    g.fillStyle = tiles[i]!;
    g.beginPath();
    g.roundRect(tx, 960, tileW, 150, 44);
    g.fill();
    g.stroke();
    g.fillStyle = ink;
    g.font = `700 60px ${display}`;
    g.fillText(n, tx + tileW / 2, 1035);
    g.font = `700 32px ${display}`;
    g.fillText(label, tx + tileW / 2, 1080);
  });
  g.fillStyle = token("muted");
  g.font = `600 34px ${display}`;
  g.fillText(L.t("recapImageFoot"), W / 2, 1210);
  return c;
}

async function shareImage(L: Translator, title: string, s: ReturnType<typeof summary>) {
  const canvas = await recapImage(L, title, s);
  const file = `glacify-bilan-${Date.now()}.png`;
  if (Capacitor.isNativePlatform()) {
    const data = canvas.toDataURL("image/png").split(",")[1]!;
    const { uri } = await Filesystem.writeFile({ path: file, data, directory: Directory.Cache });
    await Share.share({ title, files: [uri] });
    return;
  }
  const blob = await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("canvas"))), "image/png"));
  const shared = new File([blob], file, { type: "image/png" });
  if (navigator.canShare?.({ files: [shared] })) {
    await navigator.share({ title, files: [shared] });
    return;
  }
  // No share sheet (desktop): download it
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * The round in a nutshell: the flavor podium, how many ice creams and scoops,
 * how long the service took, and a picture of it to share.
 */
export function RecapBody({ data, children }: { data: RoundData; children?: ReactNode }) {
  const L = useI18n();
  const s = summary(data, L.t("removedFlavor"));
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    buzz("success");
    play("tada");
  }, []);

  const share = async () => {
    setSharing(true);
    try {
      await shareImage(L, data.round.title, s);
    } catch (e) {
      // Closing the share sheet is not an error
      if (!(e instanceof Error && /cancel|abort/i.test(e.message + e.name))) toast.error(L.t("shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  const stats: [string, string][] = [
    [String(s.ices), L.tn("iceWord", s.ices)],
    [String(s.scoops), L.tn("scoopWord", s.scoops)],
  ];
  if (s.minutes !== null) stats.push([duration(L, s.minutes), L.t("ofService")]);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="eyebrow">{L.t("recapTitle")}</p>
      <h2 className="title mt-1">{data.round.title}</h2>
      {s.podium.length > 0 && (
        <div className="mt-8 w-full">
          <PodiumView podium={s.podium} />
          <div className="h-[3px] w-full rounded-full bg-ink" />
        </div>
      )}
      <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
        {stats.map(([n, label], i) => (
          <motion.div
            key={label}
            className={clsx("card flex flex-col items-center justify-center px-1 py-3 pop:rounded-[22px]", STAT_COLOR[i])}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 + i * 0.1 }}
          >
            <span className="tabular font-display text-[24px] font-bold leading-tight">{n}</span>
            <span className="text-[12px] font-semibold text-muted pop:font-extrabold pop:text-ink">{label}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        <button className="btn-soft pop:bg-lemon pop:shadow-pop pop:hover:bg-lemon" onClick={share} disabled={sharing}>
          <Share2 size={18} /> {L.t("shareRecap")}
        </button>
        {children}
      </div>
    </div>
  );
}

/** The summary on its own screen (from the round page) */
export function RecapScreen({ data, onClose }: { data: RoundData; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-canvas pop:bg-surface"
        style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
        role="dialog"
        aria-modal="true"
        aria-label={t("recapTitle")}
      >
        <div className="mx-auto max-w-md px-5 pb-10 pt-2">
          <button
            className="icon-btn -ml-1 text-ink pop:rounded-2xl pop:border-[3px] pop:border-ink pop:bg-canvas"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={22} />
          </button>
          <div className="mt-2">
            <RecapBody data={data} />
          </div>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
}
