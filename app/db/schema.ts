import {
  customType,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** JSON kept in a TEXT column: MariaDB returns its JSON type as a plain string anyway. */
const jsonText = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "text",
    toDriver: (v) => JSON.stringify(v),
    fromDriver: (v) => JSON.parse(v) as T,
  })(name);

export const CONTAINER_KINDS = ["cone", "cup"] as const;
export const ROUND_STATUSES = ["open", "closed"] as const;
export const ORDER_SOURCES = ["host", "guest"] as const;

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 200 }).notNull(),
    /**
     * Started without an account: tied to this device's cookie, with a
     * placeholder e-mail and no password. Creating an account keeps the same user.
     */
    anonymous: tinyint("anonymous").notNull().default(0),
    /** Bumped by "sign out everywhere": older session cookies stop working */
    sessionVersion: int("session_version").notNull().default(0),
    /** Premium bought (one-time purchase); BETA_PREMIUM gives it to everyone */
    premium: tinyint("premium").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const flavors = mysqlTable(
  "flavors",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(),
    /** FLAVOR_PATTERNS: drawn over the colour, in `accent` */
    pattern: varchar("pattern", { length: 12 }).notNull().default("none"),
    accent: varchar("accent", { length: 7 }).notNull().default("#3E2A22"),
    available: tinyint("available").notNull().default(1),
    /** Removed from the carte, kept so past orders still name it */
    archived: tinyint("archived").notNull().default(0),
    position: int("position").notNull().default(0),
  },
  (t) => [index("flavors_user_idx").on(t.userId)],
);

export const toppings = mysqlTable(
  "toppings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    available: tinyint("available").notNull().default(1),
    archived: tinyint("archived").notNull().default(0),
    position: int("position").notNull().default(0),
  },
  (t) => [index("toppings_user_idx").on(t.userId)],
);

export const containers = mysqlTable(
  "containers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    kind: mysqlEnum("kind", CONTAINER_KINDS).notNull(),
    maxScoops: int("max_scoops").notNull(),
    available: tinyint("available").notNull().default(1),
    archived: tinyint("archived").notNull().default(0),
    position: int("position").notNull().default(0),
  },
  (t) => [index("containers_user_idx").on(t.userId)],
);

/** One service: a goûter, a soirée, an afternoon at the stand. */
export const rounds = mysqlTable(
  "rounds",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    title: varchar("title", { length: 80 }).notNull(),
    /** Public link /t/<code>: guests order from their own phone */
    code: varchar("code", { length: 16 }).notNull(),
    status: mysqlEnum("status", ROUND_STATUSES).notNull().default("open"),
    /** Ticked service steps, by key (see src/pages/round/Service.tsx) */
    checks: jsonText<string[]>("checks").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    closedAt: datetime("closed_at"),
  },
  (t) => [uniqueIndex("rounds_code_idx").on(t.code), index("rounds_user_idx").on(t.userId)],
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    roundId: int("round_id").notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    containerId: int("container_id").notNull(),
    /** Flavor ids, bottom scoop first */
    scoops: jsonText<number[]>("scoops").notNull(),
    toppings: jsonText<number[]>("toppings").notNull(),
    note: varchar("note", { length: 140 }),
    source: mysqlEnum("source", ORDER_SOURCES).notNull().default("host"),
    /** Secret kept by the guest's browser: lets them change or cancel their own orders */
    guestToken: varchar("guest_token", { length: 64 }),
    servedAt: datetime("served_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("orders_round_idx").on(t.roundId)],
);

export type AppUser = typeof users.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type RoundRow = typeof rounds.$inferSelect;
