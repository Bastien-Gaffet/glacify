import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-surface p-1 pop:border-[3px] pop:border-ink pop:bg-canvas">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-semibold transition pop:font-display pop:text-[15px]",
            o.value === value ? "bg-canvas text-ink shadow-soft pop:bg-accent pop:text-onaccent pop:shadow-none" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
