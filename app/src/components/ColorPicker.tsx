import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, ClipboardPaste, Copy } from "lucide-react";
import type { ScoopLook } from "@contracts/menu";
import { FlavorDot } from "./FlavorPattern";
import { Sheet } from "./Sheet";
import { useI18n } from "@/lib/i18n";

/**
 * The app's own colour picker (Android's is out of place and forgets the
 * colour): it starts from the current colour, shows before and after, and
 * offers a shade square, a hue bar, the hex code to type, copy or paste,
 * close shades and the colours already on the menu.
 */
type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function parseHex(text: string): string | null {
  const m = text
    .trim()
    .replace(/^#/, "")
    .match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: number[]) {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(clamp(c, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return rgbToHex([f(5), f(3), f(1)]);
}

/** Three lighter, the colour, three darker */
function shades(hex: string) {
  const c = hexToRgb(hex);
  const mix = (to: number, t: number) => rgbToHex(c.map((x) => x + (to - x) * t));
  return [mix(255, 0.75), mix(255, 0.5), mix(255, 0.25), hex, mix(0, 0.15), mix(0, 0.3), mix(0, 0.45)];
}

/** Follows a finger (or the mouse) across an element, as fractions of its size */
function useDrag(onMove: (x: number, y: number) => void) {
  return {
    onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const move = (ev: { clientX: number; clientY: number }) => {
        const r = el.getBoundingClientRect();
        onMove(clamp((ev.clientX - r.left) / r.width), clamp((ev.clientY - r.top) / r.height));
      };
      move(e);
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    },
  };
}

const knob = "pointer-events-none absolute rounded-full border-[3px] border-ink shadow-[0_0_0_3px_rgb(var(--canvas))]";

export function ColorPicker({
  open,
  onClose,
  title,
  look,
  palette,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The flavor as it is now: its colour is the starting point */
  look: ScoopLook;
  /** Colours already used on the menu */
  palette: string[];
  onPick: (hex: string) => void;
}) {
  const { t } = useI18n();
  const before = parseHex(look.color) ?? "#FFFFFF";
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(before));
  const [text, setText] = useState(before.slice(1));
  const hex = hsvToHex(hsv);

  // Each opening starts again from the flavor's current colour
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setHsv(hexToHsv(before));
      setText(before.slice(1));
    }
    wasOpen.current = open;
  }, [open, before]);

  const set = (next: Hsv) => {
    setHsv(next);
    setText(hsvToHex(next).slice(1));
  };
  const setHex = (h: string) => set(hexToHsv(h));
  const square = useDrag((x, y) => set({ ...hsv, s: x, v: 1 - y }));
  const hueBar = useDrag((x) => set({ ...hsv, h: x * 359.9 }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(t("copied"));
    } catch {
      toast.error(hex);
    }
  };
  const paste = async () => {
    const got = parseHex(await navigator.clipboard.readText().catch(() => ""));
    if (got) setHex(got);
    else toast.error(t("pasteFailed"));
  };
  const swatches = [...new Set(palette.map((c) => parseHex(c)).filter((c): c is string => !!c))].slice(0, 8);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <button className="btn-accent w-full py-4" onClick={() => onPick(hex)}>
          {t("keepColor")}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3.5">
          <figure className="flex flex-col items-center gap-1">
            <FlavorDot look={{ ...look, color: before }} className="h-16 w-16 -rotate-3 !rounded-[20px] border-[3px] border-ink" />
            <figcaption className="text-[12px] font-bold text-muted">{t("colorBefore")}</figcaption>
          </figure>
          <ArrowRight size={24} strokeWidth={2.6} aria-hidden="true" />
          <figure className="flex flex-col items-center gap-1">
            <FlavorDot look={{ ...look, color: hex }} className="h-20 w-20 rotate-3 !rounded-[26px] border-[3px] border-ink shadow-pop" />
            <figcaption className="text-[12px] font-bold">{t("colorAfter")}</figcaption>
          </figure>
        </div>

        <div
          {...square}
          role="slider"
          aria-label={t("shade")}
          aria-valuenow={Math.round(hsv.s * 100)}
          className="relative h-44 touch-none select-none overflow-hidden rounded-[24px] border-[3px] border-ink"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
          }}
        >
          <span
            className={`${knob} h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2`}
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              background: hex,
            }}
          />
        </div>

        <div
          {...hueBar}
          role="slider"
          aria-label={t("hue")}
          aria-valuenow={Math.round(hsv.h)}
          className="relative mx-3 h-[26px] touch-none select-none rounded-full border-[3px] border-ink"
          style={{
            background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        >
          <span
            className={`${knob} top-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2`}
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              background: `hsl(${hsv.h} 100% 50%)`,
            }}
          />
        </div>

        <div className="flex gap-2">
          <label className="field flex w-auto min-w-0 flex-1 items-center gap-1.5 py-0">
            <span className="font-extrabold text-muted">#</span>
            <input
              value={text}
              aria-label={t("hexCode")}
              maxLength={7}
              spellCheck={false}
              autoCapitalize="characters"
              className="h-12 min-w-0 flex-1 bg-transparent font-display text-[19px] font-semibold uppercase tracking-wider outline-none"
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9a-f#]/gi, "");
                setText(v.replace("#", ""));
                const got = parseHex(v);
                if (got && got.length === 7 && v.replace("#", "").length === 6) setHsv(hexToHsv(got));
              }}
            />
          </label>
          <button
            type="button"
            className="icon-btn h-[52px] w-[52px] rounded-2xl bg-surface text-ink pop:border-[3px] pop:border-ink pop:bg-lemon"
            onClick={copy}
            aria-label={t("copy")}
          >
            <Copy size={20} />
          </button>
          <button
            type="button"
            className="icon-btn h-[52px] w-[52px] rounded-2xl bg-surface text-ink pop:border-[3px] pop:border-ink pop:bg-lilac"
            onClick={paste}
            aria-label={t("paste")}
          >
            <ClipboardPaste size={20} />
          </button>
        </div>

        <div>
          <p className="label">{t("nearShades")}</p>
          <div className="flex justify-between">
            {shades(hex).map((c, i) => (
              <button
                key={`${i}-${c}`}
                type="button"
                onClick={() => setHex(c)}
                aria-label={t("colorN", { c })}
                className={`h-10 w-10 rounded-full transition active:scale-90 ${i === 3 ? "border-[3.5px] border-ink" : "border-2 border-ink/25"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {swatches.length > 0 && (
          <div>
            <p className="label">{t("yourFlavors")}</p>
            <div className="flex flex-wrap gap-2.5">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHex(c)}
                  aria-label={t("colorN", { c })}
                  className="h-[34px] w-[34px] rounded-xl border-[2.5px] border-ink transition active:scale-90"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
