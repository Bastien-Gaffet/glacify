import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, LogOut, MonitorSmartphone, PencilLine, Sparkles, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { MenuGroup, MenuRow } from "@/components/menu";
import { Sheet } from "@/components/Sheet";
import { confirmDialog } from "@/components/Confirm";
import { FREE_LIMITS } from "@contracts/plans";
import { initials } from "@/lib/format";
import { showError } from "@/lib/errors";

type Open = null | "name" | "account" | "password";

export default function Me() {
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
  const updateProfile = trpc.auth.updateProfile.useMutation({ onSuccess: done("Prénom enregistré"), onError: showError });
  const register = trpc.auth.register.useMutation({ onSuccess: done("Compte créé"), onError: showError });
  const changePassword = trpc.auth.changePassword.useMutation({ onSuccess: done("Mot de passe changé"), onError: showError });
  const everywhere = trpc.auth.logoutEverywhere.useMutation({ onSuccess: done("Les autres appareils sont déconnectés"), onError: showError });
  if (!user) return null;

  const openSheet = (o: Open) => {
    setName(user.name);
    setEmail("");
    setOpen(o);
  };

  return (
    <div className="page-in space-y-7">
      <PageHeader title="Moi" />

      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-ink font-display text-2xl font-bold text-onink">{initials(user.name)}</span>
        <div className="min-w-0">
          <p className="truncate font-display text-[22px] font-bold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.anonymous ? "Sans compte, sur cet appareil" : user.email}</p>
        </div>
      </div>

      <div className="rounded-[28px] bg-ink p-5 text-onink">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <p className="font-display text-lg font-bold">{user.beta ? "Bêta gratuite" : user.premium ? "Premium" : "Version gratuite"}</p>
        </div>
        <p className="mt-1 text-sm text-onink/70">
          {user.beta
            ? "Glacify est entièrement gratuit pendant la bêta : tournées et glaces illimitées."
            : user.premium
              ? "Tournées et glaces illimitées."
              : `${FREE_LIMITS.openRounds} tournée ouverte à la fois, ${FREE_LIMITS.ordersPerRound} glaces par tournée.`}
        </p>
      </div>

      {user.anonymous && (
        <div className="card p-5">
          <p className="font-semibold">Gardez votre carte et vos tournées</p>
          <p className="mt-1 text-sm text-muted">Sans compte, tout est lié à cet appareil. Un compte les retrouve partout, sans rien perdre.</p>
          <button className="btn-ink mt-4 w-full" onClick={() => openSheet("account")}>
            <UserPlus size={17} /> Créer un compte
          </button>
        </div>
      )}

      <MenuGroup title="Profil">
        <MenuRow icon={PencilLine} label="Prénom" value={user.name} onClick={() => openSheet("name")} />
      </MenuGroup>

      {!user.anonymous && (
        <MenuGroup title="Compte et sécurité">
          <MenuRow icon={KeyRound} label="Changer le mot de passe" onClick={() => openSheet("password")} />
          <MenuRow
            icon={MonitorSmartphone}
            label="Déconnecter les autres appareils"
            onClick={async () => {
              if (await confirmDialog({ title: "Déconnecter les autres appareils ?", message: "Cet appareil reste connecté.", confirmLabel: "Déconnecter" }))
                everywhere.mutate();
            }}
          />
        </MenuGroup>
      )}

      <MenuGroup>
        <MenuRow
          icon={LogOut}
          label={user.anonymous ? "Quitter cette session" : "Se déconnecter"}
          danger
          onClick={async () => {
            const ok = await confirmDialog(
              user.anonymous
                ? {
                    title: "Quitter sans compte ?",
                    message: "Sans compte, vous ne pourrez plus retrouver votre carte ni vos tournées.",
                    confirmLabel: "Quitter",
                    danger: true,
                  }
                : { title: "Se déconnecter ?", confirmLabel: "Se déconnecter" },
            );
            if (ok) logout();
          }}
        />
      </MenuGroup>

      <p className="text-center text-xs text-muted">Glacify · version bêta</p>

      <Sheet
        open={open === "name"}
        onClose={() => setOpen(null)}
        title="Votre prénom"
        footer={
          <button className="btn-ink w-full py-4" disabled={!name.trim() || updateProfile.isPending} onClick={() => updateProfile.mutate({ name: name.trim() })}>
            Enregistrer
          </button>
        }
      >
        <p className="mb-3 text-sm text-muted">Vos invités le voient sur le lien de commande.</p>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
      </Sheet>

      <Sheet
        open={open === "account"}
        onClose={() => setOpen(null)}
        title="Créer un compte"
        footer={
          <button
            className="btn-ink w-full py-4"
            disabled={!name.trim() || !email || password.length < 8 || register.isPending}
            onClick={() => register.mutate({ name: name.trim(), email, password })}
          >
            Créer mon compte
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="acc-name">
              Prénom
            </label>
            <input id="acc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="given-name" />
          </div>
          <div>
            <label className="label" htmlFor="acc-email">
              E-mail
            </label>
            <input id="acc-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="acc-pw">
              Mot de passe
            </label>
            <input id="acc-pw" className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-muted">8 caractères minimum.</p>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={open === "password"}
        onClose={() => setOpen(null)}
        title="Changer le mot de passe"
        footer={
          <button
            className="btn-ink w-full py-4"
            disabled={!password || newPassword.length < 8 || changePassword.isPending}
            onClick={() => changePassword.mutate({ currentPassword: password, newPassword })}
          >
            Enregistrer
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="pw-current">
              Mot de passe actuel
            </label>
            <input id="pw-current" className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">
              Nouveau mot de passe
            </label>
            <input id="pw-new" className="field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-muted">8 caractères minimum. Les autres appareils seront déconnectés.</p>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
