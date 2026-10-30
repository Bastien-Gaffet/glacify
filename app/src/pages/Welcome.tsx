import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { IceCream } from "@/components/IceCream";
import { showError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { usePop } from "@/lib/style";

type Mode = "start" | "login" | "register";

function Sparkle({ className, fill }: { className: string; fill: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`absolute ${className}`}>
      <path d="M12 2 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4 Z" fill={fill} stroke="rgb(var(--ink))" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Pop: three ice creams stuck on a lilac card, each at its own height and
 * angle. The card follows the screen's height so the whole page fits.
 */
function PopHero() {
  return (
    <div className="relative h-[clamp(230px,34svh,320px)] overflow-hidden rounded-[38px] border-[3px] border-ink bg-lilac">
      <Sparkle className="left-[26px] top-[26px] h-[30px] w-[30px]" fill="rgb(var(--lemon))" />
      <Sparkle className="right-[26px] top-[34px] h-5 w-5" fill="#FFFFFF" />
      <Sparkle className="bottom-[24px] right-[24px] h-6 w-6" fill="rgb(var(--lemon))" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="-mr-1 translate-y-[38px] -rotate-[10deg]">
          <IceCream kind="cup" colors={["#A9CF8A", "#F2E3B3"]} size={104} />
        </div>
        <div className="rotate-[4deg]">
          <IceCream kind="cone" colors={["#F2E3B3", "#6B3F2A", "#F29BB0"]} size={132} />
        </div>
        <div className="-ml-1 translate-y-[2px] rotate-[12deg]">
          <IceCream kind="cone" colors={["#9FE0C8", "#D9416A"]} size={98} />
        </div>
      </div>
    </div>
  );
}

/**
 * First screen. Starting needs no account: a session on this device, with the
 * carte and rounds kept on the server; an account can be created later (Moi)
 * without losing anything.
 */
export default function Welcome() {
  const { t, lang } = useI18n();
  const pop = usePop();
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
    if (mode === "start") guest.mutate({ name: name.trim() || undefined, lang });
    else if (mode === "login") login.mutate({ email, password });
    else register.mutate({ email, password, name, lang });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100svh-var(--safe-top))] max-w-md flex-col px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-10 pop:px-5 pop:pb-[max(1rem,var(--safe-bottom))] pop:pt-3">
      <div className="page-in flex-1">
        {pop && <PopHero />}
        <div className="flex items-end justify-center gap-1 pop:hidden">
          <IceCream kind="cup" colors={["#A9CF8A", "#F2E3B3"]} size={64} />
          <IceCream kind="cone" colors={["#F2E3B3", "#6B3F2A", "#F29BB0"]} size={84} />
          <IceCream kind="cone" colors={["#FFB547", "#D9416A"]} size={64} />
        </div>
        <h1 className="mt-8 text-center font-display text-[56px] font-extrabold leading-none tracking-tight pop:mt-4 pop:text-[50px] pop:font-bold pop:tracking-normal">Glacify</h1>
        <p className="mx-auto mt-3 max-w-[300px] text-center text-[17px] leading-snug text-muted pop:mt-2 pop:text-[16px] pop:font-bold">
          {t("welcomeTagline")}
        </p>
      </div>

      <form key={mode} onSubmit={submit} className="page-in mt-10 space-y-3 pop:mt-5">
        {mode !== "start" && (
          <button type="button" onClick={() => setMode("start")} className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft size={16} /> {t("back")}
          </button>
        )}
        {mode !== "login" && (
          <div>
            <label className="label" htmlFor="name">
              {mode === "start" ? t("welcomeNameOptional") : t("firstName")}
            </label>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} required={mode === "register"} maxLength={120} autoComplete="given-name" />
          </div>
        )}
        {mode !== "start" && (
          <>
            <div>
              <label className="label" htmlFor="email">
                {t("email")}
              </label>
              <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">
                {t("password")}
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
              {mode === "register" && <p className="mt-1.5 text-xs text-muted">{t("passwordHint")}</p>}
            </div>
          </>
        )}
        <button type="submit" className="btn-ink w-full py-4 text-base" disabled={busy}>
          {mode === "start" ? (
            <>
              {t("start")} <ArrowRight size={18} />
            </>
          ) : mode === "login" ? (
            <>
              <LogIn size={18} /> {t("signIn")}
            </>
          ) : (
            <>
              <UserPlus size={18} /> {t("createMyAccount")}
            </>
          )}
        </button>
        {mode === "start" && <p className="text-center text-xs text-muted">{t("welcomeNoAccount")}</p>}
      </form>

      {pop && mode === "start" ? (
        <div className="mt-3 flex gap-2.5">
          <button onClick={() => setMode("login")} className="btn flex-1 whitespace-nowrap border-[3px] border-ink px-2 py-2.5 text-[15px]">
            {t("signIn")}
          </button>
          <button onClick={() => setMode("register")} className="btn flex-1 whitespace-nowrap border-[3px] border-ink bg-mint px-2 py-2.5 text-[15px]">
            {t("createAccount")}
          </button>
        </div>
      ) : (
      <div className="mt-6 flex flex-col items-center gap-2.5 text-sm text-muted">
        {mode !== "login" && (
          <button onClick={() => setMode("login")} className="hover:text-ink">
            {t("haveAccount")} <span className="font-semibold text-ink">{t("signIn")}</span>
          </button>
        )}
        {mode !== "register" && (
          <button onClick={() => setMode("register")} className="hover:text-ink">
            {t("registerWithEmail")}
          </button>
        )}
      </div>
      )}
    </div>
  );
}
