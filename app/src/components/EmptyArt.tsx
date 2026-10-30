/**
 * Drawings for empty screens, outlined like stickers, in the theme's colours:
 * "rounds" (nothing yet: a cone waiting), "orders" (an empty cup and its
 * spoon), "closed" (a tub with its lid on), "lost" (an ice cream melted on
 * the floor, for a link that leads nowhere).
 */
export type EmptyKind = "rounds" | "orders" | "closed" | "lost";

const ink = "rgb(var(--ink))";
const c = (name: string) => `rgb(var(--${name}))`;
const line = { stroke: ink, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x} ${y - 8 * s} L${x + 2.5 * s} ${y - 2.5 * s} L${x + 8 * s} ${y} L${x + 2.5 * s} ${y + 2.5 * s} L${x} ${y + 8 * s} L${x - 2.5 * s} ${y + 2.5 * s} L${x - 8 * s} ${y} L${x - 2.5 * s} ${y - 2.5 * s} Z`} fill={c("sun")} {...line} strokeWidth={3} />;
}

export function EmptyArt({ kind, size = 150 }: { kind: EmptyKind; size?: number }) {
  return (
    <svg viewBox="0 0 160 140" width={size} height={(size * 140) / 160} aria-hidden="true" className="pop-in">
      {kind === "rounds" && (
        <g>
          <g transform="rotate(-10 80 80)">
            <circle cx="80" cy="34" r="22" fill={c("accent")} {...line} />
            <circle cx="80" cy="56" r="25" fill={c("mint")} {...line} />
            <path d="M54 66 L80 132 L106 66 Z" fill={c("sun")} {...line} />
            <ellipse cx="70" cy="26" rx="6" ry="3.5" fill="#fff" opacity="0.7" transform="rotate(-25 70 26)" />
            <ellipse cx="70" cy="46" rx="6.5" ry="3.8" fill="#fff" opacity="0.7" transform="rotate(-25 70 46)" />
          </g>
          <Sparkle x={130} y={30} />
          <Sparkle x={28} y={52} s={0.7} />
          <Sparkle x={134} y={98} s={0.6} />
        </g>
      )}
      {kind === "orders" && (
        <g>
          <path d="M66 58 a22 22 0 0 1 44 0" fill="none" {...line} strokeDasharray="7 7" />
          <path d="M40 62 L120 62 L110 124 L50 124 Z" fill="#fff" {...line} />
          <path d="M43 78 L117 78 L115 90 L45 90 Z" fill={c("accent")} {...line} strokeWidth={3} />
          <g transform="rotate(28 118 40)">
            <rect x="113" y="6" width="10" height="56" rx="5" fill={c("lilac")} {...line} />
            <ellipse cx="118" cy="10" rx="12" ry="9" fill={c("lilac")} {...line} />
          </g>
          <Sparkle x={30} y={36} s={0.7} />
        </g>
      )}
      {kind === "closed" && (
        <g>
          <rect x="34" y="58" width="92" height="64" rx="14" fill="#fff" {...line} />
          <rect x="36" y="74" width="88" height="11" fill={c("accent")} />
          <path d="M34 74 L126 74 M34 85 L126 85" stroke={ink} strokeWidth="3" />
          <rect x="26" y="40" width="108" height="22" rx="11" fill={c("lilac")} {...line} />
          <rect x="70" y="30" width="20" height="14" rx="6" fill={c("lilac")} {...line} />
          <text x="132" y="34" fontFamily="var(--font-display)" fontWeight="700" fontSize="20" fill={ink}>z</text>
          <text x="142" y="20" fontFamily="var(--font-display)" fontWeight="700" fontSize="14" fill={ink}>z</text>
        </g>
      )}
      {kind === "lost" && (
        <g>
          <path d="M22 118 C 22 104, 52 100, 64 106 C 74 96, 104 96, 112 106 C 128 100, 142 108, 138 118 C 136 128, 26 130, 22 118 Z" fill={c("accent")} {...line} />
          <circle cx="58" cy="114" r="3" fill={ink} />
          <circle cx="78" cy="114" r="3" fill={ink} />
          <path d="M62 122 q6 -5 12 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <g transform="rotate(-38 110 70)">
            <path d="M92 50 L110 104 L128 50 Z" fill={c("sun")} {...line} />
          </g>
          <path d="M40 40 q6 -10 0 -20 M56 30 q6 -10 0 -20" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}
