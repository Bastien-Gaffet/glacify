import type { ScoopLook } from "@contracts/menu";

// Marks laid out once in a 100×100 box: a flavor always looks the same
const FLECKS: [x: number, y: number, angle: number][] = [
  [18, 22, -20], [44, 13, 35], [71, 21, -50], [29, 43, 60], [55, 37, 10], [83, 41, -30], [14, 63, 25],
  [41, 60, -60], [66, 57, 45], [88, 68, -10], [29, 83, 15], [55, 81, -40], [77, 88, 70], [48, 26, 80],
];
const SEEDS: [x: number, y: number][] = [
  [12, 18], [27, 9], [40, 24], [58, 12], [74, 22], [90, 14], [19, 36], [35, 44], [52, 33], [67, 41],
  [84, 36], [9, 55], [25, 61], [44, 57], [60, 63], [77, 55], [93, 60], [15, 79], [33, 76], [51, 85],
  [69, 78], [86, 84], [40, 93], [62, 95],
];
const CHUNKS: [x: number, y: number, r: number][] = [
  [24, 27, 9], [62, 21, 7], [44, 51, 10], [79, 55, 8], [21, 74, 7], [56, 81, 9], [87, 29, 6],
];
const SWIRLS = [
  "M-6 32 C 18 12, 38 52, 62 32 S 96 18, 108 38",
  "M-6 72 C 22 52, 44 92, 68 70 S 98 60, 108 80",
];

/** The flavor's pattern, drawn in a 100×100 box (nothing for a plain colour) */
export function PatternMarks({ pattern, accent }: Pick<ScoopLook, "pattern" | "accent">) {
  switch (pattern) {
    case "flecks":
      return (
        <g fill={accent}>
          {FLECKS.map(([x, y, a], i) => (
            <rect key={i} x={x - 4} y={y - 1.6} width={i % 3 ? 8 : 6} height={3.2} rx={1} transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </g>
      );
    case "seeds":
      return (
        <g fill={accent}>
          {SEEDS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 4 ? 1.5 : 2} />
          ))}
        </g>
      );
    case "chunks":
      return (
        <g fill={accent} opacity={0.9}>
          {CHUNKS.map(([x, y, r], i) => (
            <rect key={i} x={x - r} y={y - r * 0.8} width={r * 2} height={r * 1.6} rx={r * 0.55} transform={`rotate(${i * 37} ${x} ${y})`} />
          ))}
        </g>
      );
    case "swirl":
      return (
        <g fill="none" stroke={accent} strokeWidth={8} strokeLinecap="round" opacity={0.85}>
          {SWIRLS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** The pattern laid over an HTML element filled with the flavor's colour (it must be `relative`) */
export function PatternOverlay({ look }: { look: Pick<ScoopLook, "pattern" | "accent"> }) {
  if (look.pattern === "none") return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <PatternMarks pattern={look.pattern} accent={look.accent} />
    </svg>
  );
}

/** A round swatch of the flavor: its colour and its pattern */
export function FlavorDot({ look, className = "h-10 w-10" }: { look: ScoopLook; className?: string }) {
  return (
    <span
      className={`relative flex-none overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ${className}`}
      style={{ background: look.color }}
    >
      <PatternOverlay look={look} />
    </span>
  );
}
