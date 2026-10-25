import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appSecret: required("APP_SECRET") || "dev-secret-not-for-production",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  host: process.env.HOST ?? "127.0.0.1",
  port: parseInt(process.env.PORT || "3000"),
  registrationOpen: process.env.REGISTRATION_OPEN !== "false",
  /**
   * Free beta, as in Equiliz: everything is unlimited for everyone. On unless
   * BETA_PREMIUM=false, so a deploy without the variable stays free.
   */
  betaPremium: process.env.BETA_PREMIUM !== "false",
};
