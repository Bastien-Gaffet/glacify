import { clsx } from "clsx";

/** On (pistachio, knob right) or off. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx("relative h-7 w-12 flex-none rounded-full transition-colors", checked ? "bg-pistache" : "bg-sunken")}
    >
      <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}
