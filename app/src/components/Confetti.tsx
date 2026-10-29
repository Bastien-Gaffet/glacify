import type { CSSProperties } from "react";

/**
 * A burst of colour out of the middle of its (relative) parent, in plain CSS:
 * the guests' page does without the animation library.
 */
export function Confetti({ colors, count = 26 }: { colors: string[]; count?: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 110 + ((i * 37) % 90);
        const size = 8 + ((i * 13) % 8);
        return (
          <span
            key={i}
            className="confetti-bit"
            style={
              {
                width: size,
                height: i % 3 === 0 ? size * 0.5 : size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                borderRadius: i % 3 === 0 ? 3 : 999,
                background: colors[i % colors.length],
                animationDelay: `${(i % 4) * 40}ms`,
                "--dx": `${Math.cos(angle) * dist}px`,
                "--dy": `${Math.sin(angle) * dist + 40}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
