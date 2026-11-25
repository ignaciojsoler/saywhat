import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

/**
 * Minimal Mercado Pago client (Checkout Pro) over the REST API.
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro
 */

const API = "https://api.mercadopago.com"

export const mpConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN)

async function mp<T>(path: string, schema: z.ZodType<T>, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("Mercado Pago isn't configured (missing MP_ACCESS_TOKEN)")
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${(body as { message?: string }).message ?? "request failed"}`)
  return schema.parse(body)
}

const Preference = z.object({ id: z.string(), init_point: z.string().url() })

export type PreferenceInput = {
  orderId: string
  title: string
  price: number
  currency: string
  payerEmail: string
  /** absolute base URL of this app, e.g. https://saywhat.app */
  appUrl: string
}

export function createPreference(i: PreferenceInput) {
  const publicHttps = i.appUrl.startsWith("https://")
  const back = `${i.appUrl}/api/checkout/return`
  return mp("/checkout/preferences", Preference, {
    method: "POST",
    idempotencyKey: i.orderId,
    body: JSON.stringify({
      items: [{ id: i.orderId, title: i.title, quantity: 1, unit_price: i.price, currency_id: i.currency }],
      payer: { email: i.payerEmail },
      external_reference: i.orderId,
      back_urls: { success: back, pending: back, failure: back },
      // MP rejects auto_return and webhooks pointing at http://localhost; the return URL syncs the payment either way
      ...(publicHttps ? { auto_return: "approved", notification_url: `${i.appUrl}/api/webhooks/mercadopago` } : {}),
      statement_descriptor: "SAYWHAT",
      // no cash vouchers: they take days to clear and buyers expect credits right away
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
    }),
  })
}

const Payment = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  external_reference: z.string().nullish(),
  transaction_amount: z.number(),
  currency_id: z.string(),
})
export type Payment = z.infer<typeof Payment>

export const getPayment = (id: string) => mp(`/v1/payments/${encodeURIComponent(id)}`, Payment)

/**
 * Validates the `x-signature` header of a webhook notification.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` signed with HMAC-SHA256 using the webhook secret.
 */
export function verifyWebhookSignature(opts: {
  signature: string | null
  requestId: string | null
  dataId: string
  secret: string
  /** reject notifications older than this (ms); 0 disables the check */
  maxAgeMs?: number
  now?: number
}): boolean {
  if (!opts.signature) return false
  const parts = Object.fromEntries(
    opts.signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=")
      return [k, v.join("=")]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const maxAge = opts.maxAgeMs ?? 0
  if (maxAge > 0) {
    const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts)
    if (!Number.isFinite(tsMs) || Math.abs((opts.now ?? Date.now()) - tsMs) > maxAge) return false
  }

  // MP lowercases alphanumeric ids before signing
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId
  let manifest = `id:${id};`
  if (opts.requestId) manifest += `request-id:${opts.requestId};`
  manifest += `ts:${ts};`

  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex")
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(v1, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}
