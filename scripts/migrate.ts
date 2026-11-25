// Apply the SQL migrations in ./drizzle to DATABASE_URL (local file or Turso).
// Unlike `drizzle-kit push`, it prints the real error if the connection or a migration fails.
// Usage: DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… bun scripts/migrate.ts
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"

const url = process.env.DATABASE_URL ?? "file:local.db"
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })

try {
  await client.execute("select 1")
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" })
  const { rows } = await client.execute("select name from sqlite_master where type = 'table' order by name")
  console.log(`Migrated ${url.replace(/\/\/.*@/, "//")}: ${rows.map((r) => r.name).join(", ")}`)
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  client.close()
}
