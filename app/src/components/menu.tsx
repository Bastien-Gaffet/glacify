import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

export type Tone = "sun" | "mint" | "lilac" | "lemon";

// Pop: each tone's tile leans its own way, like stickers stuck by hand
const TONES: Record<Tone, string> = {
  sun: "pop:bg-sun pop:-rotate-3",
  mint: "pop:bg-mint pop:rotate-[4deg]",
  lilac: "pop:bg-lilac pop:rotate-[5deg]",
  lemon: "pop:bg-lemon pop:-rotate-[5deg]",
};

/** Rows grouped in one card, separated by thin lines. */
export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <p className="eyebrow mb-2 px-1 pop:font-display pop:text-[20px] pop:font-bold pop:text-ink">{title}</p>}
      <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line pop:[&>*+*]:border-t-2 pop:[&>*+*]:border-ink/10">{children}</div>
    </section>
  );
}

export function MenuRow({
  icon: Icon,
  label,
  value,
  to,
  onClick,
  danger,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  /** Colour of the icon's tile in the pop look */
  tone?: Tone;
}) {
  const inner = (
    <>
      <IconTile icon={Icon} tone={tone} danger={danger} />
      <span className={`min-w-0 flex-1 truncate font-medium ${danger ? "text-danger" : ""}`}>{label}</span>
      {value && <span className="max-w-[45%] flex-none truncate text-sm text-muted">{value}</span>}
      <ChevronRight size={17} className="flex-none text-muted" />
    </>
  );
  const cls = "flex min-h-[64px] w-full items-center gap-3.5 px-4 text-left transition hover:bg-sunken/60 active:bg-sunken";
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** A row's icon: a soft square, or a tilted colour sticker in pop. */
export function IconTile({ icon: Icon, tone, danger }: { icon: React.ComponentType<{ size?: number; className?: string }>; tone?: Tone; danger?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-canvas pop:rounded-[14px] pop:border-[2.5px] pop:border-ink ${tone ? TONES[tone] : ""} ${danger ? "text-danger pop:text-accent" : "text-ink"}`}
    >
      <Icon size={19} />
    </span>
  );
}
