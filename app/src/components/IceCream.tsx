import { useId } from "react";
import type { ContainerKind, ScoopLook } from "@contracts/menu";
import { PatternMarks } from "./FlavorPattern";
import { usePop } from "@/lib/style";

/**
 * The ice cream itself: stacked scoops (bottom first) on a cone or in a cup,
 * each in its flavor's colour and pattern. An empty order shows a dashed
 * placeholder scoop. In the pop look everything is outlined in ink, like the
 * cone on the home screen.
 */
export function IceCream({
  kind,
  colors,
  size = 56,
  animateLast,
  className,
}: {
  kind: ContainerKind;
  /** Bottom scoop first: a plain colour, or a flavor's full look */
  colors: (string | ScoopLook)[];
  size?: number;
  /** The last scoop drops into place (while composing an order) */
  animateLast?: boolean;
  className?: string;
}) {
  const clip = useId();
  const pop = usePop();
  // The outline must stay inside the drawing: a little more room in pop
  const pad = pop ? 2 : 0;
  const r = 13;
  const step = 11;
  const scoops = colors.length ? colors : [null];
  const n = scoops.length;
  const bottomCy = 3 + pad + r + (n - 1) * step;
  const cone = kind === "cone";
  // The bottom scoop sinks into its container: half into the cone, more into the cup
  const baseY = bottomCy + (cone ? 1 : -3);
  const height = baseY + (cone ? 34 : 24) + 1 + pad;
  const outline = pop ? { stroke: "rgb(var(--ink))", strokeWidth: 3, strokeLinejoin: "round" as const } : null;

  return (
    <svg
      viewBox={`0 0 60 ${height}`}
      overflow="visible"
      width={size}
      height={(size * height) / 60}
      aria-hidden="true"
      className={className}
    >
      {/* Scoops first: the container is drawn over the bottom scoop, which sits in it */}
      {scoops
        .map((color, i) => {
          const cy = bottomCy - i * step;
          const cx = 30 + (i % 2 === 0 ? 0 : i % 4 === 1 ? -2.5 : 2.5);
          const last = i === n - 1;
          if (!color)
            return pop ? (
              <circle key="empty" cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--ink))" strokeOpacity="0.35" strokeWidth="2.6" strokeDasharray="5 4" />
            ) : (
              <circle key="empty" cx={cx} cy={cy} r={r} fill="none" stroke="#CFCAC5" strokeWidth="1.6" strokeDasharray="4 3.5" />
            );
          const look = typeof color === "string" ? { color, pattern: "none" as const, accent: "" } : color;
          return (
            <g key={`${i}-${look.color}-${look.pattern}`} className={animateLast && last ? "scoop-drop" : undefined}>
              <circle cx={cx} cy={cy} r={r} fill={look.color} />
              {look.pattern !== "none" && (
                <>
                  <clipPath id={`${clip}-${i}`}>
                    <circle cx={cx} cy={cy} r={r - 0.3} />
                  </clipPath>
                  <g clipPath={`url(#${clip}-${i})`}>
                    <g transform={`translate(${cx - r} ${cy - r}) scale(${(2 * r) / 100})`}>
                      <PatternMarks pattern={look.pattern} accent={look.accent} />
                    </g>
                  </g>
                </>
              )}
              {outline ? (
                <circle cx={cx} cy={cy} r={r} fill="none" {...outline} />
              ) : (
                <>
                  <path d={`M${cx - r + 1.5} ${cy + 4} a${r} ${r} 0 0 0 ${2 * r - 3} 0`} fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="3" />
                  <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="#000" strokeOpacity="0.08" />
                </>
              )}
              <ellipse cx={cx - 5} cy={cy - 5.5} rx="3.6" ry="2.2" fill="#fff" opacity="0.55" transform={`rotate(-25 ${cx - 5} ${cy - 5.5})`} />
            </g>
          );
        })
        .reverse()}
      {pop ? (
        cone ? (
          <path d={`M15 ${baseY} L30 ${baseY + 34} L45 ${baseY} Z`} fill="#F2C46B" {...outline} />
        ) : (
          <>
            <path d={`M9 ${baseY} L51 ${baseY} L46 ${baseY + 24} L14 ${baseY + 24} Z`} fill="#FFFFFF" {...outline} />
            <path d={`M10.6 ${baseY + 6} L49.4 ${baseY + 6} L48.7 ${baseY + 10} L11.3 ${baseY + 10} Z`} fill="rgb(var(--accent))" />
          </>
        )
      ) : cone ? (
        <>
          <clipPath id={clip}>
            <path d={`M15 ${baseY} L30 ${baseY + 34} L45 ${baseY} Z`} />
          </clipPath>
          <path d={`M14 ${baseY} Q14 ${baseY - 1} 15 ${baseY - 1} L45 ${baseY - 1} Q46 ${baseY - 1} 46 ${baseY} L31 ${baseY + 34} Q30 ${baseY + 35} 29 ${baseY + 34} Z`} fill="#E9B872" />
          <g clipPath={`url(#${clip})`} stroke="#C98D47" strokeWidth="1.4" opacity="0.8">
            {[-12, -4, 4, 12, 20].map((d) => (
              <path key={`a${d}`} d={`M${15 + d} ${baseY} l20 26`} />
            ))}
            {[-12, -4, 4, 12, 20].map((d) => (
              <path key={`b${d}`} d={`M${45 - d} ${baseY} l-20 26`} />
            ))}
          </g>
        </>
      ) : (
        <>
          <path d={`M9 ${baseY} L51 ${baseY} L46 ${baseY + 24} L14 ${baseY + 24} Z`} fill="#FFFFFF" stroke="#E6E3E0" strokeWidth="1" />
          <path d={`M10.3 ${baseY + 6} L49.7 ${baseY + 6} L49 ${baseY + 9.5} L11 ${baseY + 9.5} Z`} fill="rgb(var(--accent))" />
        </>
      )}
    </svg>
  );
}
