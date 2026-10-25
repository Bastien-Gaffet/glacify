// Applies pending SQL migrations from db/migrations.
// Replaces `drizzle-kit migrate`, which fails silently on MariaDB syntax errors.
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const db = drizzle(process.env.DATABASE_URL);
try {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("[migrate] up to date");
  process.exit(0);
} catch (e) {
  console.error("[migrate] failed:", e.cause ?? e);
  process.exit(1);
}
