import "server-only"
import { and, eq, or } from "drizzle-orm"
import { db } from "@/db"
import { creditLedger } from "@/db/schema"

export type CreditHistory = {
  /** The user has spent at least one credit captioning a video. */
  hasSpent: boolean
  /** The user has bought at least one credit pack. */
  hasPurchased: boolean
}

/**
 * Reads the user's ledger to tell whether they captioned videos or bought credits before.
 * Used by the videos library to explain why an empty list may not mean lost work.
 */
export async function getCreditHistory(userId: string): Promise<CreditHistory> {
  const reasons = await db
    .selectDistinct({ reason: creditLedger.reason })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), or(eq(creditLedger.reason, "video"), eq(creditLedger.reason, "purchase"))))
  return {
    hasSpent: reasons.some((r) => r.reason === "video"),
    hasPurchased: reasons.some((r) => r.reason === "purchase"),
  }
}
