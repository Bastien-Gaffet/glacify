import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";

function connect() {
  // Every DATETIME is UTC, whatever the server's own zone
  const pool = mysql.createPool({ uri: env.databaseUrl, timezone: "Z", connectionLimit: 5 });
  return drizzle(pool, { mode: "default", schema });
}

let instance: ReturnType<typeof connect>;

export function getDb() {
  if (!instance) instance = connect();
  return instance;
}
