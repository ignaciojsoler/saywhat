import "server-only"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { user } from "@/db/schema"
import { auth } from "./auth"

export type Account = { id: string; name: string; email: string; image: string | null; credits: number }

/** The signed-in user (with a fresh credit balance), or null. Reads the request, so call it inside <Suspense>. */
export async function getAccount(): Promise<Account | null> {
  const s = await auth.api.getSession({ headers: await headers() })
  if (!s) return null
  const row = await db.query.user.findFirst({ where: eq(user.id, s.user.id), columns: { credits: true } })
  if (!row) return null
  return { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image ?? null, credits: row.credits }
}

export async function requireAccount(next = "/app"): Promise<Account> {
  const a = await getAccount()
  if (!a) redirect(`/login?next=${encodeURIComponent(next)}`)
  return a
}
