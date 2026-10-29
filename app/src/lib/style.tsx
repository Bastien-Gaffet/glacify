import { createContext, useContext, useState, type ReactNode } from "react";
import type { TKey } from "./i18n";

/**
 * Looks of the app, chosen in Moi > Préférences. "pop" (colour blocks, black
 * outlines) is the default; "epure" keeps the first, minimal look.
 */
export const STYLES: { code: Style; name: TKey; sub: TKey }[] = [
  { code: "pop", name: "stylePop", sub: "stylePopSub" },
  { code: "epure", name: "styleEpure", sub: "styleEpureSub" },
];

export type Style = "pop" | "epure";

const STORAGE_KEY = "glacify-style";

function detect(): Style {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "epure") return "epure";
  } catch {
    /* storage unavailable */
  }
  return "pop";
}

// Set before the first render: the CSS reads it, no flash of the other look
const apply = (s: Style) => {
  document.documentElement.dataset.style = s;
};
apply(detect());

const StyleContext = createContext<{ style: Style; setStyle: (s: Style) => void } | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [style, setState] = useState<Style>(detect);
  const setStyle = (s: Style) => {
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* storage unavailable */
    }
    apply(s);
    setState(s);
  };
  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
}

export function useStyle() {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle outside StyleProvider");
  return ctx;
}

/** True in the pop look */
export const usePop = () => useStyle().style === "pop";
