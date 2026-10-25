import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `generate` works offline; `migrate` needs a real DATABASE_URL.
const connectionString = process.env.DATABASE_URL ?? "mysql://offline@127.0.0.1/glacify";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
