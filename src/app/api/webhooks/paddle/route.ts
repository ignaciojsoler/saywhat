import { syncPaddleTransaction } from "@/lib/billing/orders"
import { verifyPaddleSignature } from "@/lib/billing/paddle"

/**
 * POST /api/webhooks/paddle — transaction notifications (Paddle → Developer tools → Notifications: add a
 * destination with this URL, events transaction.paid / transaction.completed / transaction.payment_failed,
 * and copy its secret key into PADDLE_WEBHOOK_SECRET).
 */
export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return new Response("Webhook secret not configured", { status: 500 })

  // the signature covers the exact raw body, so read it as text before parsing
  const rawBody = await request.text()
  const valid = verifyPaddleSignature({
    header: request.headers.get("paddle-signature"),
    rawBody,
    secret,
    // generous tolerance: Paddle retries failed deliveries, and each retry is signed afresh
    maxAgeMs: 5 * 60 * 1000,
  })
  if (!valid) return new Response("Invalid signature", { status: 401 })

  let event: { event_type?: string; data?: { id?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response("Bad payload", { status: 400 })
  }
  const txnId = event.data?.id
  // other events (subscriptions, customers, …): acknowledge so Paddle stops retrying
  if (!event.event_type?.startsWith("transaction.") || !txnId?.startsWith("txn_")) return new Response(null, { status: 200 })

  try {
    // re-read the transaction so out-of-order deliveries can't roll its state back
    const r = await syncPaddleTransaction(txnId)
    // unknown orders (e.g. transactions made outside this app): ack, don't retry
    return Response.json(r)
  } catch (e) {
    console.error("[paddle webhook]", e)
    // 5xx makes Paddle retry later
    return new Response("Sync failed", { status: 500 })
  }
}
