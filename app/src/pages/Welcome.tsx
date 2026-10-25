import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { IceCream } from "@/components/IceCream";
import { showError } from "@/lib/errors";

type Mode = "start" | "login" | "register";

/**
 * First screen. Starting needs no account: a session on this device, with the
 * carte and rounds kept on the server; an account can be created later (Moi)
 * without losing anything.
 */
export default function Welcome() {
  const [mode, setMode] = useState<Mode>("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const onSuccess = () => utils.auth.me.invalidate();
  const login = trpc.auth.login.useMutation({ onSuccess, onError: showError });
  const register = trpc.auth.register.useMutation({ onSuccess, onError: showError });
  const guest = trpc.auth.startGuest.useMutation({ onSuccess, onError: showError });
  const busy = login.isPending || register.isPending || guest.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "start") guest.mutate({ name: name.trim() || undefined });
    else if (mode === "login") login.mutate({ email, password });
    else register.mutate({ email, password, name });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100svh-var(--safe-top))] max-w-md flex-col px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-10">
      <div className="page-in flex-1">
        <div className="flex items-end justify-center gap-1">
          <IceCream kind="cup" colors={["#A9CF8A", "#F2E3B3"]} size={64} />
          <IceCream kind="cone" colors={["#F2E3B3", "#6B3F2A", "#F29BB0"]} size={84} />
          <IceCream kind="cone" colors={["#FFB547", "#D9416A"]} size={64} />
        </div>
        <h1 className="mt-8 text-center font-display text-[56px] font-extrabold leading-none tracking-tight">Glacify</h1>
        <p className="mx-auto mt-3 max-w-[300px] text-center text-[17px] leading-snug text-muted">
          Chacun choisit sa glace, vous servez dans le bon ordre.
        </p>
      </div>

      <form key={mode} onSubmit={submit} className="page-in mt-10 space-y-3">
        {mode !== "start" && (
          <button type="button" onClick={() => setMode("start")} className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft size={16} /> Retour
          </button>
        )}
        {mode !== "login" && (
          <div>
            <label className="label" htmlFor="name">
              {mode === "start" ? "Votre prénom (facultatif)" : "Prénom"}
            </label>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} required={mode === "register"} maxLength={120} autoComplete="given-name" />
          </div>
        )}
        {mode !== "start" && (
          <>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
              {mode === "register" && <p className="mt-1.5 text-xs text-muted">8 caractères minimum.</p>}
            </div>
          </>
        )}
        <button type="submit" className="btn-ink w-full py-4 text-base" disabled={busy}>
          {mode === "start" ? (
            <>
              Commencer <ArrowRight size={18} />
            </>
          ) : mode === "login" ? (
            <>
              <LogIn size={18} /> Se connecter
            </>
          ) : (
            <>
              <UserPlus size={18} /> Créer mon compte
            </>
          )}
        </button>
        {mode === "start" && <p className="text-center text-xs text-muted">Sans compte pour commencer. Vous pourrez en créer un plus tard sans rien perdre.</p>}
      </form>

      <div className="mt-6 flex flex-col items-center gap-2.5 text-sm text-muted">
        {mode !== "login" && (
          <button onClick={() => setMode("login")} className="hover:text-ink">
            J'ai déjà un compte · <span className="font-semibold text-ink">Se connecter</span>
          </button>
        )}
        {mode !== "register" && (
          <button onClick={() => setMode("register")} className="hover:text-ink">
            Créer un compte avec mon e-mail
          </button>
        )}
      </div>
    </div>
  );
}
