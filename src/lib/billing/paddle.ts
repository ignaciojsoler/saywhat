import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

/**
 * Minimal Paddle Billing client over the REST API (Paddle is the merchant of record: it charges the
 * buyer in USD, handles sales tax / VAT and pays out to us).
 * Docs: https://developer.paddle.com/api-reference/overview
 */

export const paddleConfigured = () =>
  Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRODUCT_ID && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)

const apiBase = () => (process.env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com")

async function paddle<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const key = process.env.PADDLE_API_KEY
  if (!key) throw new Error("Paddle isn't configured (missing PADDLE_API_KEY)")
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    cache: "no-store",
  })
  const body = (await res.json().catch(() => ({}))) as { data?: unknown; error?: { code?: string; detail?: string } }
  if (!res.ok) throw new Error(`Paddle ${res.status}: ${body.error?.code ?? ""} ${body.error?.detail ?? "request failed"}`.trim())
  return schema.parse(body.data)
}

const Transaction = z.object({
  id: z.string(),
  /** draft | ready | billed | paid | completed | canceled | past_due */
  status: z.string(),
  currency_code: z.string(),
  custom_data: z.record(z.string(), z.unknown()).nullish(),
  checkout: z.object({ url: z.string().nullish() }).nullish(),
  items: z.array(
    z.object({
      quantity: z.number(),
      price: z.object({ unit_price: z.object({ amount: z.string(), currency_code: z.string() }) }),
    }),
  ),
  details: z.object({ totals: z.object({ discount: z.string().nullish() }).nullish() }).nullish(),
})
export type Transaction = z.infer<typeof Transaction>

/**
 * Creates a transaction for one pack (a non-catalog price under PADDLE_PRODUCT_ID, so the amount comes
 * from our code) and returns it with `checkout.url`: the default payment link with `?_ptxn=<id>`.
 */
export function createTransaction(i: { orderId: string; packName: string; credits: number; amountUsd: number }) {
  return paddle("/transactions", Transaction, {
    method: "POST",
    body: JSON.stringify({
      currency_code: "USD",
      collection_mode: "automatic",
      custom_data: { order_id: i.orderId },
      items: [
        {
          quantity: 1,
          price: {
            product_id: process.env.PADDLE_PRODUCT_ID,
            name: `${i.packName} pack`,
            description: `${i.credits} video credits`,
            unit_price: { amount: String(Math.round(i.amountUsd * 100)), currency_code: "USD" },
            tax_mode: "account_setting",
            quantity: { minimum: 1, maximum: 1 },
          },
        },
      ],
    }),
  })
}

export const getTransaction = (id: string) => paddle(`/transactions/${encodeURIComponent(id)}`, Transaction)

/** paid = the buyer's payment went through; completed = Paddle finished processing it */
export const isPaid = (status: string) => status === "paid" || status === "completed"

/**
 * Amount actually charged for the items, in whole currency units, before tax (Paddle adds sales tax / VAT
 * on top of or inside the unit price depending on the buyer's country; the unit price is what we set).
 */
export function transactionAmount(t: Transaction): number {
  const cents = t.items.reduce((sum, it) => sum + Number(it.price.unit_price.amount) * it.quantity, 0)
  const discount = Number(t.details?.totals?.discount ?? 0)
  return (cents - discount) / 100
}

/**
 * Validates the `Paddle-Signature` header (`ts=<unix>;h1=<hex>[;h1=<hex>…]`): HMAC-SHA256 of
 * `<ts>:<raw body>` keyed with the notification destination's secret. Several h1 appear during secret rotation.
 */
export function verifyPaddleSignature(opts: {
  header: string | null
  rawBody: string
  secret: string
  /** reject notifications older than this (ms); 0 disables the check */
  maxAgeMs?: number
  now?: number
}): boolean {
  if (!opts.header) return false
  let ts: string | undefined
  const h1: string[] = []
  for (const part of opts.header.split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === "ts") ts = v.join("=")
    else if (k === "h1") h1.push(v.join("="))
  }
  if (!ts || !/^\d+$/.test(ts) || !h1.length) return false

  const maxAge = opts.maxAgeMs ?? 0
  if (maxAge > 0 && Math.abs((opts.now ?? Date.now()) - Number(ts) * 1000) > maxAge) return false

  const expected = Buffer.from(createHmac("sha256", opts.secret).update(`${ts}:${opts.rawBody}`).digest("hex"), "hex")
  return h1.some((sig) => {
    const b = Buffer.from(sig, "hex")
    return b.length === expected.length && timingSafeEqual(b, expected)
  })
}
