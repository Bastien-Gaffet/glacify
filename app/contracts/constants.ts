export const Session = {
  cookieName: "glacify_session",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Connexion requise",
} as const;
