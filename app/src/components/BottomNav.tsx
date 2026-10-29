import { NavLink, useLocation } from "react-router";
import { IceCreamCone, Palette, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { useI18n, type TKey } from "@/lib/i18n";
import { usePop } from "@/lib/style";

const TABS: { to: string; label: TKey; icon: typeof IceCreamCone; end: boolean }[] = [
  { to: "/", label: "navRounds", icon: IceCreamCone, end: true },
  { to: "/carte", label: "navMenu", icon: Palette, end: false },
  { to: "/moi", label: "navMe", icon: UserRound, end: false },
];

/** Pop look: a floating outlined pill, the current tab filled in framboise */
function PopNav() {
  const { t } = useI18n();
  // A round's screen belongs to the rounds tab
  const inRound = useLocation().pathname.startsWith("/r/");
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(var(--safe-bottom)+14px)]">
      <div className="pointer-events-auto mx-auto flex max-w-md overflow-hidden rounded-[32px] border-[3px] border-ink bg-canvas shadow-[0_5px_0_rgb(var(--ink))]">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-0.5 rounded-[29px] pb-2 pt-2.5 font-display text-[13px] font-semibold transition-colors duration-200",
                isActive || (inRound && to === "/") ? "bg-accent text-onaccent" : "text-muted hover:text-ink",
              )
            }
          >
            <Icon size={27} strokeWidth={2.1} />
            {t(label)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  if (usePop()) return <PopNav />;
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
