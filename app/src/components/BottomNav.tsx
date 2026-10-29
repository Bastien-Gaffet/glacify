import { NavLink } from "react-router";
import { IceCreamCone, Palette, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { useI18n, type TKey } from "@/lib/i18n";

const TABS: { to: string; label: TKey; icon: typeof IceCreamCone; end: boolean }[] = [
  { to: "/", label: "navRounds", icon: IceCreamCone, end: true },
  { to: "/carte", label: "navMenu", icon: Palette, end: false },
  { to: "/moi", label: "navMe", icon: UserRound, end: false },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[var(--safe-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl px-2">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                isActive ? "text-ink" : "text-muted hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx("flex h-8 w-14 items-center justify-center rounded-full transition", isActive && "bg-surface")}>
                  <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                {t(label)}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
