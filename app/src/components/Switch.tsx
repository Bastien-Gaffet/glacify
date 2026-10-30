import { clsx } from "clsx";

/** On (pistachio, knob right) or off. Outlined in ink, mint when on, in pop. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-7 w-12 flex-none rounded-full transition-colors pop:border-[2.5px] pop:border-ink",
        checked ? "bg-pistache pop:bg-mint" : "bg-sunken",
      )}
    >
      <span
        className={clsx(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all pop:top-[2px] pop:h-[18px] pop:w-[18px] pop:border-2 pop:border-ink pop:shadow-none",
          checked ? "left-6 pop:left-[22px]" : "left-1 pop:left-[2px]",
        )}
      />
    </button>
  );
}
