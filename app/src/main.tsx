import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import { I18nProvider } from "@/lib/i18n";
import { StyleProvider } from "@/lib/style";
import App from "./App";
import { watchUpdates } from "@/lib/updates";

watchUpdates();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <StyleProvider>
          <TRPCProvider>
            <App />
          </TRPCProvider>
        </StyleProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
