import "server-only"
import { and, eq, gte, sql } from "drizzle-orm"
import { db } from "@/db"
import { creditLedger, user } from "@/db/schema"

/** Atomically take one credit. Returns the new balance, or null when the balance is empty. */
export async function spendCredit(userId: string, note: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(user)
      .set({ credits: sql`${user.credits} - 1` })
      .where(and(eq(user.id, userId), gte(user.credits, 1)))
      .returning({ credits: user.credits })
    if (!row) return null
    await tx.insert(creditLedger).values({ userId, delta: -1, reason: "video", note })
    return row.credits
  })
}

/** Give a credit back after a failed transcription. */
export async function refundCredit(userId: string, note: string): Promise<number> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(user)
      .set({ credits: sql`${user.credits} + 1` })
      .where(eq(user.id, userId))
      .returning({ credits: user.credits })
    await tx.insert(creditLedger).values({ userId, delta: 1, reason: "refund", note })
    return row?.credits ?? 0
  })
}
