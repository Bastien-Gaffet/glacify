import { toast } from "sonner";
import { decodeError } from "@contracts/errors";
import { i18n, type TKey } from "./i18n";

/**
 * Server errors arrive as a code (see contracts/errors.ts), worded here in
 * the reader's language; network failures and invalid input get a plain line.
 */
export function errorText(e: { message: string }) {
  const { t } = i18n();
  const known = decodeError(e.message);
  if (known) return t(`err.${known.code}` as TKey, known.params);
  if (/fetch|network|JSON/i.test(e.message)) return t("networkError");
  if (e.message.startsWith("[")) return t("invalidInput");
  return e.message;
}

export function showError(e: { message: string }) {
  toast.error(errorText(e));
}
