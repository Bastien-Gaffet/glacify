import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import { I18nProvider } from "@/lib/i18n";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
