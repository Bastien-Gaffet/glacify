import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

/** Rows grouped in one card, separated by thin lines. */
export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <p className="eyebrow mb-2 px-1">{title}</p>}
      <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-line">{children}</div>
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
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-canvas ${danger ? "text-danger" : "text-ink"}`}>
        <Icon size={19} />
      </span>
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
