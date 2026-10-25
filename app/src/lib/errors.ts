import { toast } from "sonner";

/** Server messages are written for people (in French); network failures are not. */
export function showError(e: { message: string }) {
  const msg = /fetch|network|JSON/i.test(e.message) ? "Connexion impossible, réessayez." : e.message;
  toast.error(msg);
}
