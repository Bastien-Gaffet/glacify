import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fr } from "./locales/fr";
import { en } from "./locales/en";
import type { Dict, PluralKey, TKey } from "./locales/types";

export type { TKey };

/** Languages of the app (same model as Equiliz). French is the reference. */
export const LANGS = [
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "en", name: "English", locale: "en-GB" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

const DICTS: Record<Lang, Dict> = { fr, en };
const STORAGE_KEY = "glacify-lang";

export function isLang(v: unknown): v is Lang {
  return LANGS.some((l) => l.code === v);
}

/** BCP 47 locale for dates. */
export const localeOf = (lang: Lang) => LANGS.find((l) => l.code === lang)!.locale;

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = (navigator.language || "fr").toLowerCase().slice(0, 2);
  return nav === "fr" ? "fr" : "en";
}

export type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/** French counts 0 and 1 as singular, English only 1 */
const isOne = (lang: Lang, n: number) => (lang === "fr" ? Math.abs(n) < 2 : n === 1);

export function translator(lang: Lang) {
  const dict = DICTS[lang];
  const t = (key: TKey, vars?: Vars) => fill(dict[key] ?? fr[key], vars);
  /** "{n} glace" / "{n} glaces": the key's `_one` or `_other` form */
  const tn = (key: PluralKey, n: number, vars?: Vars) => t(`${key}_${isOne(lang, n) ? "one" : "other"}` as TKey, { n, ...vars });
  return { lang, t, tn, locale: localeOf(lang) };
}

export type Translator = ReturnType<typeof translator>;

// For code outside React (error toasts): the language currently shown
let current = translator(detect());
export const i18n = () => current;

type I18n = Translator & { setLang: (l: Lang) => void };
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current.lang);
  current = translator(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
    setLangState(l);
  };
  return <I18nContext.Provider value={{ ...current, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
