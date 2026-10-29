/**
 * Errors the server sends as a stable code, with optional values: the app
 * words them in the reader's language (`err.<code>` in its dictionaries).
 */
export const ERROR_CODES = [
  "unauthenticated",
  "tooManyAttempts",
  "retry",
  "notFound",
  "registrationClosed",
  "emailTaken",
  "alreadyConverted",
  "badCredentials",
  "badCurrentPassword",
  "round.notFound",
  "round.linkNotFound",
  "round.closed",
  "round.full",
  "order.notFound",
  "order.served",
  "order.tooManyForGuest",
  "order.containerUnavailable",
  "order.noScoop",
  "order.maxScoops",
  "order.flavorUnavailable",
  "order.toppingTwice",
  "order.toppingUnavailable",
  "menu.flavorsFull",
  "menu.listFull",
  "menu.keepOneContainer",
  "plan.openRounds",
  "plan.ordersPerRound",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorParams = Record<string, string | number>;
export type AppError = { code: ErrorCode; params?: ErrorParams };

/** "order.maxScoops|{"max":3}" */
export const encodeError = ({ code, params }: AppError) => (params ? `${code}|${JSON.stringify(params)}` : code);

export function decodeError(message: string): AppError | null {
  const [code, json] = message.split(/\|(.*)/s);
  if (!(ERROR_CODES as readonly string[]).includes(code!)) return null;
  try {
    return { code: code as ErrorCode, params: json ? (JSON.parse(json) as ErrorParams) : undefined };
  } catch {
    return { code: code as ErrorCode };
  }
}
