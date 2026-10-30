import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { ConfirmHost } from "@/components/Confirm";
import { SyncBadge } from "@/components/SyncBadge";
import Welcome from "@/pages/Welcome";
import Home from "@/pages/Home";
import Round from "@/pages/Round";
import Carte from "@/pages/Carte";
import Me from "@/pages/Me";
import GuestOrder from "@/pages/GuestOrder";

// Below the status bar and camera notch
const TOAST_OFFSET = { top: "calc(var(--safe-top) + 16px)" };

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function Shell() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-5 pb-[calc(96px+var(--safe-bottom))] pt-[calc(24px+var(--sync-gap,0px))] transition-[padding] pop:pb-[calc(124px+var(--safe-bottom))]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:id" element={<Round />} />
          <Route path="/carte" element={<Carte />} />
          <Route path="/moi" element={<Me />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

/** Signed-in screens; without a session, the welcome screen. */
function HostApp() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Shell /> : <Welcome />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        offset={TOAST_OFFSET}
        mobileOffset={TOAST_OFFSET}
        duration={4000}
        toastOptions={{
          style: {
            background: "rgb(var(--ink))",
            border: "none",
            color: "rgb(var(--on-ink))",
            fontSize: "15px",
            padding: "14px 18px",
            borderRadius: "20px",
          },
          // Readable on the ink background
          classNames: { description: "!text-onink/75" },
        }}
      />
      <ConfirmHost />
      <SyncBadge />
      <ScrollTop />
      <Routes>
        {/* Guests order from a shared link: no account, no navigation */}
        <Route path="/t/:code" element={<GuestOrder />} />
        <Route path="*" element={<HostApp />} />
      </Routes>
    </>
  );
}
