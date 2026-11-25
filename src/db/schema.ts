import { sql } from "drizzle-orm"
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull(),
}

/* ---------- Better Auth tables (field names must match Better Auth's model) ---------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  /** prepaid balance: 1 credit = 1 captioned video */
  credits: integer("credits").default(0).notNull(),
  ...timestamps,
})

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
)

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
)

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
)

/* ---------- Billing ---------- */

/** A checkout attempt for a credit pack. Credited at most once (credited_at guards it). */
export const order = sqliteTable(
  "order",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packId: text("pack_id").notNull(),
    credits: integer("credits").notNull(),
    /** whole units of `currency` (ARS pesos, US dollars), before any tax the merchant of record adds */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    /** mercadopago (ARS) | paddle (USD) */
    provider: text("provider").notNull().default("mercadopago"),
    /** pending | approved | in_process | rejected | cancelled | refunded | ... (mirrors the provider) */
    status: text("status").notNull().default("pending"),
    /** provider checkout id: Mercado Pago preference id / Paddle transaction id */
    preferenceId: text("preference_id"),
    /** provider payment id: Mercado Pago payment id / Paddle transaction id */
    paymentId: text("payment_id").unique(),
    creditedAt: integer("credited_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("order_user_idx").on(t.userId)],
)

/** Append-only history of balance changes: +welcome, +purchase, -video, +refund. */
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason", { enum: ["welcome", "purchase", "video", "refund"] }).notNull(),
    /** order id for purchases; file name for videos */
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("ledger_user_idx").on(t.userId, t.createdAt)],
)

/* ---------- Projects ("My videos") ---------- */

/**
 * A captioned video. Text data only: the video file itself never leaves the user's browser
 * (it's kept in IndexedDB on the device that uploaded it).
 */
export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** original file metadata, used to match the file when relinking it on another device */
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull().default(0),
    /** seconds */
    duration: real("duration").notNull().default(0),
    /** output frame: original | 9:16 | 1:1 | 16:9 */
    aspect: text("aspect").notNull().default("original"),
    /** transcript: [{ w, s, e }] (word, start, end in seconds) */
    words: text("words", { mode: "json" }).$type<{ w: string; s: number; e: number }[]>().notNull(),
    /** caption style (CaptionStyle); null until the editor saves one */
    style: text("style", { mode: "json" }).$type<Record<string, unknown>>(),
    /** words = per-word timing from Whisper, vtt = approximated per sentence */
    timingSource: text("timing_source", { enum: ["words", "vtt"] }).notNull().default("words"),
    lastExportedAt: integer("last_exported_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("project_user_idx").on(t.userId, t.updatedAt)],
)
