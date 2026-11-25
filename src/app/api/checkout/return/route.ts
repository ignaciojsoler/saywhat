import { redirect } from "next/navigation"
import { syncMercadoPagoPayment, syncPaddleTransaction, type SyncResult } from "@/lib/billing/orders"
import { auth } from "@/lib/auth"

/**
 * GET /api/checkout/return — where buyers land after paying:
 * - Mercado Pago (back_urls) adds ?payment_id&status.
 * - Paddle (checkout successUrl, set on /pay) comes with ?provider=paddle&txn=<transaction id>.
 * Syncing here too means credits show up immediately, even before (or without) the webhook.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) redirect("/login?next=/app/credits")

  const paddleTxn = url.searchParams.get("provider") === "paddle" ? url.searchParams.get("txn") : null
  const mpPayment = url.searchParams.get("payment_id") ?? url.searchParams.get("collection_id")
  const sync: (() => Promise<SyncResult>) | null = paddleTxn?.startsWith("txn_")
    ? () => syncPaddleTransaction(paddleTxn)
    : mpPayment && mpPayment !== "null"
      ? () => syncMercadoPagoPayment(mpPayment)
      : null
  if (!sync) redirect("/app/credits?purchase=cancelled")

  let outcome = "error"
  try {
    let r = await sync()
    // Paddle redirects as soon as the checkout completes; the charge usually settles a moment later
    for (let i = 0; paddleTxn && r.ok && !r.paid && i < 4; i++) {
      await new Promise((ok) => setTimeout(ok, 750))
      r = await sync()
    }
    if (r.ok && r.userId === session.user.id) {
      // Paddle may still be confirming the charge right after checkout: that's "pending", the webhook finishes it
      outcome = r.paid ? "success" : r.status === "rejected" || r.status === "canceled" ? "failure" : "pending"
    }
  } catch (e) {
    console.error("[checkout return]", e)
  }
  redirect(`/app/credits?purchase=${outcome}`)
}
