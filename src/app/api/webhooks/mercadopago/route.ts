import { syncMercadoPagoPayment } from "@/lib/billing/orders"
import { verifyWebhookSignature } from "@/lib/billing/mercadopago"

/**
 * POST /api/webhooks/mercadopago — payment notifications (configure this URL and copy the secret in
 * Mercado Pago → Your integrations → Webhooks, event "Payments").
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } }
  const type = url.searchParams.get("type") ?? body.type
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null)

  // other topics (merchant orders, tests without an id): acknowledge so MP stops retrying
  if (type !== "payment" || !dataId) return new Response(null, { status: 200 })

  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return new Response("Webhook secret not configured", { status: 500 })
  const valid = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret,
    maxAgeMs: 15 * 60 * 1000,
  })
  if (!valid) return new Response("Invalid signature", { status: 401 })

  try {
    const r = await syncMercadoPagoPayment(dataId)
    // unknown orders belong to another integration on the same account: ack, don't retry
    return Response.json(r)
  } catch (e) {
    console.error("[mercadopago webhook]", e)
    // 5xx makes MP retry later
    return new Response("Sync failed", { status: 500 })
  }
}
