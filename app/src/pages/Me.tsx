import { useState } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Languages, LogOut, MonitorSmartphone, Paintbrush, PartyPopper, PencilLine, Volume2, Sparkles, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { MenuGroup, MenuRow } from "@/components/menu";
import { Sheet } from "@/components/Sheet";
import { confirmDialog } from "@/components/Confirm";
import { FREE_LIMITS } from "@contracts/plans";
import { initials } from "@/lib/format";
import { showError } from "@/lib/errors";
import { LANGS, useI18n } from "@/lib/i18n";
import { STYLES, usePop, useStyle } from "@/lib/style";
import { FlavorDot } from "@/components/FlavorPattern";
import { IconTile } from "@/components/menu";
import { setSoundsOn, soundsOn } from "@/lib/sound";
import { playfulOn, setPlayfulOn } from "@/lib/playful";
import { Switch } from "@/components/Switch";

type Open = null | "name" | "account" | "password" | "lang" | "style";

export default function Me() {
  const { t, tn, lang, setLang } = useI18n();
  const { style, setStyle } = useStyle();
  const pop = usePop();
  const [sounds, setSounds] = useState(soundsOn);
  const [playful, setPlayful] = useState(playfulOn);
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const utils = trpc.useUtils();
  const done = (msg: string) => () => {
    utils.auth.me.invalidate();
    setOpen(null);
    setPassword("");
    setNewPassword("");
    toast.success(msg);
  };
  const updateProfile = trpc.auth.updateProfile.useMutation({ onSuccess: done(t("nameSaved")), onError: showError });
  const register = trpc.auth.register.useMutation({ onSuccess: done(t("accountCreated")), onError: showError });
  const changePassword = trpc.auth.changePassword.useMutation({ onSuccess: done(t("passwordChanged")), onError: showError });
  const everywhere = trpc.auth.logoutEverywhere.useMutation({ onSuccess: done(t("othersSignedOut")), onError: showError });
  // Pop's number tiles: all-time counts and the most ordered flavor
  const { data: stats } = trpc.rounds.stats.useQuery(undefined, { enabled: pop && !!user });
  const { data: favorite } = trpc.menu.favorite.useQuery(undefined, { enabled: pop && !!user });
  const { data: menu } = trpc.menu.get.useQuery(undefined, { enabled: pop && !!user });
  const favLook = favorite && menu?.flavors.find((f) => f.id === favorite.flavorId);
  if (!user) return null;

  const openSheet = (o: Open) => {
    setName(user.name);
    setEmail("");
    setOpen(o);
  };

  return (
    <div className="page-in space-y-7">
      <PageHeader title={t("navMe")} />

      {pop ? (
        <>
          <div className="flex items-center gap-3.5 rounded-[32px] border-[3px] border-ink bg-lilac p-[18px]">
            <span className="flex h-16 w-16 flex-none -rotate-[7deg] items-center justify-center rounded-[22px] border-[3px] border-ink bg-lemon font-display text-[28px] font-bold">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[26px] font-bold leading-tight">{user.name}</p>
              <p className="truncate text-[13px] font-bold">{user.anonymous ? t("noAccountDevice") : user.email}</p>
            </div>
            <button className="icon-btn h-10 w-10 border-[2.5px] border-ink bg-canvas text-ink" onClick={() => openSheet("name")} aria-label={t("firstName")}>
              <PencilLine size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[22px] border-[3px] border-ink bg-sun px-1.5 py-2.5 text-center">
              <p className="tabular font-display text-[28px] font-bold leading-none">{stats?.rounds ?? "–"}</p>
              <p className="mt-1 text-[12px] font-extrabold">{tn("statRounds", stats?.rounds ?? 0)}</p>
            </div>
            <div className="rounded-[22px] border-[3px] border-ink bg-mint px-1.5 py-2.5 text-center">
              <p className="tabular font-display text-[28px] font-bold leading-none">{stats?.served ?? "–"}</p>
              <p className="mt-1 text-[12px] font-extrabold">{tn("statServed", stats?.served ?? 0)}</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[22px] border-[3px] border-ink bg-canvas px-1.5 py-2" title={t("favoriteFlavor")}>
              {favLook ? (
                <>
                  <FlavorDot look={favLook} className="h-[34px] w-[34px] -rotate-6 !rounded-[12px] border-[2.5px] border-ink" />
                  <p className="mt-1 max-w-full truncate text-[12px] font-extrabold">{favLook.name}</p>
                </>
              ) : (
                <p className="text-center text-[12px] font-extrabold text-muted">{t("noFavoriteYet")}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-ink font-display text-2xl font-bold text-onink">{initials(user.name)}</span>
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] font-bold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.anonymous ? t("noAccountDevice") : user.email}</p>
          </div>
        </div>
      )}

      {/* During the free beta nothing is said about plans (Bastien, 29 Oct 2026) */}
      {!user.beta && (
        <div className="rounded-[28px] bg-ink p-5 text-onink">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <p className="font-display text-lg font-bold">{user.premium ? t("planPremium") : t("planFree")}</p>
          </div>
          <p className="mt-1 text-sm text-onink/70">
            {user.premium ? t("premiumText") : t("freeText", { rounds: FREE_LIMITS.openRounds, orders: FREE_LIMITS.ordersPerRound })}
          </p>
        </div>
      )}

      {user.anonymous && (
        <div className="card p-5">
          <p className="font-semibold">{t("keepTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("keepText")}</p>
          <button className="btn-ink mt-4 w-full" onClick={() => openSheet("account")}>
            <UserPlus size={17} /> {t("createAccount")}
          </button>
        </div>
      )}

      {!pop && (
        <MenuGroup title={t("profile")}>
          <MenuRow icon={PencilLine} label={t("firstName")} value={user.name} onClick={() => openSheet("name")} />
        </MenuGroup>
      )}

      <MenuGroup title={t("preferences")}>
        <MenuRow icon={Languages} tone="lemon" label={t("language")} value={LANGS.find((l) => l.code === lang)!.name} onClick={() => setOpen("lang")} />
        <div className="flex min-h-[64px] w-full items-center gap-3.5 px-4 py-2">
          <IconTile icon={Volume2} tone="mint" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{t("sounds")}</span>
            <span className="block text-sm leading-snug text-muted">{t("soundsSub")}</span>
          </span>
          <Switch
            checked={sounds}
            label={t("sounds")}
            onChange={(on) => {
              setSoundsOn(on);
              setSounds(on);
            }}
          />
        </div>
        <div className="flex min-h-[64px] w-full items-center gap-3.5 px-4 py-2">
          <IconTile icon={PartyPopper} tone="lilac" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{t("playful")}</span>
            <span className="block text-sm leading-snug text-muted">{t("playfulSub")}</span>
          </span>
          <Switch
            checked={playful}
            label={t("playful")}
            onChange={(on) => {
              setPlayfulOn(on);
              setPlayful(on);
            }}
          />
        </div>
        <MenuRow icon={Paintbrush} tone="sun" label={t("style")} value={t(STYLES.find((s) => s.code === style)!.name)} onClick={() => setOpen("style")} />
      </MenuGroup>

      {!user.anonymous && (
        <MenuGroup title={t("accountSecurity")}>
          <MenuRow icon={KeyRound} tone="lilac" label={t("changePassword")} onClick={() => openSheet("password")} />
          <MenuRow
            icon={MonitorSmartphone}
            tone="lemon"
            label={t("logoutOthers")}
            onClick={async () => {
              if (await confirmDialog({ title: t("logoutOthersConfirm"), message: t("logoutOthersMsg"), confirmLabel: t("logoutOthersOk") }))
                everywhere.mutate();
            }}
          />
        </MenuGroup>
      )}

      <LeaveButton
          pop={pop}
          label={user.anonymous ? t("leaveSession") : t("signOut")}
          onClick={async () => {
            const ok = await confirmDialog(
              user.anonymous
                ? {
                    title: t("leaveTitle"),
                    message: t("leaveMsg"),
                    confirmLabel: t("leave"),
                    danger: true,
                  }
                : { title: t("signOutTitle"), confirmLabel: t("signOut") },
            );
            if (ok) logout();
          }}
        />

      <p className="text-center text-xs text-muted">Glacify</p>

      <Sheet
        open={open === "name"}
        onClose={() => setOpen(null)}
        title={t("yourFirstName")}
        footer={
          <button className="btn-ink w-full py-4" disabled={!name.trim() || updateProfile.isPending} onClick={() => updateProfile.mutate({ name: name.trim() })}>
            {t("save")}
          </button>
        }
      >
        <p className="mb-3 text-sm text-muted">{t("nameSeenByGuests")}</p>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
      </Sheet>

      <Sheet
        open={open === "account"}
        onClose={() => setOpen(null)}
        title={t("createAccount")}
        footer={
          <button
            className="btn-ink w-full py-4"
            disabled={!name.trim() || !email || password.length < 8 || register.isPending}
            onClick={() => register.mutate({ name: name.trim(), email, password, lang })}
          >
            {t("createMyAccount")}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="acc-name">
              {t("firstName")}
            </label>
            <input id="acc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="given-name" />
          </div>
          <div>
            <label className="label" htmlFor="acc-email">
              {t("email")}
            </label>
            <input id="acc-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="acc-pw">
              {t("password")}
            </label>
            <input id="acc-pw" className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-muted">{t("passwordHint")}</p>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={open === "password"}
        onClose={() => setOpen(null)}
        title={t("changePassword")}
        footer={
          <button
            className="btn-ink w-full py-4"
            disabled={!password || newPassword.length < 8 || changePassword.isPending}
            onClick={() => changePassword.mutate({ currentPassword: password, newPassword })}
          >
            {t("save")}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="pw-current">
              {t("currentPassword")}
            </label>
            <input id="pw-current" className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">
              {t("newPassword")}
            </label>
            <input id="pw-new" className="field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-muted">{t("newPasswordHint")}</p>
          </div>
        </div>
      </Sheet>

      <Sheet open={open === "lang"} onClose={() => setOpen(null)} title={t("language")}>
        <MenuGroup>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => (setLang(l.code), setOpen(null))}
              className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left font-medium transition hover:bg-sunken/60"
              aria-pressed={l.code === lang}
            >
              <span className="flex-1">{l.name}</span>
              {l.code === lang && <Check size={19} className="text-pistache" strokeWidth={2.6} />}
            </button>
          ))}
        </MenuGroup>
      </Sheet>

      <Sheet open={open === "style"} onClose={() => setOpen(null)} title={t("style")}>
        <MenuGroup>
          {STYLES.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => (setStyle(s.code), setOpen(null))}
              className="flex min-h-[68px] w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-sunken/60"
              aria-pressed={s.code === style}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t(s.name)}</span>
                <span className="block text-sm text-muted">{t(s.sub)}</span>
              </span>
              {s.code === style && <Check size={19} className="text-pistache" strokeWidth={2.6} />}
            </button>
          ))}
        </MenuGroup>
      </Sheet>
    </div>
  );
}

/** Signing out: a row in the plain look, an outlined framboise pill in pop */
function LeaveButton({ pop, label, onClick }: { pop: boolean; label: string; onClick: () => void }) {
  if (pop)
    return (
      <button className="btn w-full border-[3px] border-ink py-3.5 text-[17px] text-accent active:scale-[0.98]" onClick={onClick}>
        <LogOut size={19} strokeWidth={2.5} /> {label}
      </button>
    );
  return (
    <MenuGroup>
      <MenuRow icon={LogOut} label={label} danger onClick={onClick} />
    </MenuGroup>
  );
}
