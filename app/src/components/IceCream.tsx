import { useId } from "react";
import type { ContainerKind } from "@contracts/menu";

/**
 * The ice cream itself: stacked scoops (bottom first) on a cone or in a cup.
 * An empty order shows dashed placeholder scoops.
 */
export function IceCream({
  kind,
  colors,
  size = 56,
  animateLast,
  className,
}: {
  kind: ContainerKind;
  colors: string[];
  size?: number;
  /** The last scoop drops into place (while composing an order) */
  animateLast?: boolean;
  className?: string;
}) {
  const clip = useId();
  const r = 13;
  const step = 11;
  const scoops = colors.length ? colors : [null];
  const n = scoops.length;
  const bottomCy = 3 + r + (n - 1) * step;
  const cone = kind === "cone";
  // The bottom scoop sinks into its container: half into the cone, more into the cup
  const baseY = bottomCy + (cone ? 1 : -3);
  const height = baseY + (cone ? 34 : 24) + 1;

  return (
    <svg
      viewBox={`0 0 60 ${height}`}
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
          return color ? (
            <g key={`${i}-${color}`} className={animateLast && last ? "scoop-drop" : undefined}>
              <circle cx={cx} cy={cy} r={r} fill={color} />
              <path d={`M${cx - r + 1.5} ${cy + 4} a${r} ${r} 0 0 0 ${2 * r - 3} 0`} fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="3" />
              <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="#000" strokeOpacity="0.08" />
              <ellipse cx={cx - 5} cy={cy - 5.5} rx="3.6" ry="2.2" fill="#fff" opacity="0.55" transform={`rotate(-25 ${cx - 5} ${cy - 5.5})`} />
            </g>
          ) : (
            <circle key="empty" cx={cx} cy={cy} r={r} fill="none" stroke="#CFCAC5" strokeWidth="1.6" strokeDasharray="4 3.5" />
          );
        })
        .reverse()}
      {cone ? (
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
