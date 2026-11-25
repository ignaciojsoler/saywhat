import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { creditLedger, order, user } from "@/db/schema"
import type { Pack } from "./packs"
import { createPreference, getPayment, type Payment } from "./mercadopago"
import { createTransaction, getTransaction, isPaid, transactionAmount, type Transaction } from "./paddle"

/** mercadopago charges ARS (Argentina); paddle charges USD (everyone else) */
export const PROVIDERS = ["paddle", "mercadopago"] as const
export type Provider = (typeof PROVIDERS)[number]
export const PROVIDER_CURRENCY = { paddle: "USD", mercadopago: "ARS" } as const satisfies Record<Provider, string>

/** Creates an order and the provider's hosted checkout for it. Returns the URL to send the buyer to. */
export async function createCheckout(opts: { userId: string; email: string; pack: Pack; provider: Provider; appUrl: string }) {
  const id = randomUUID()
  const currency = PROVIDER_CURRENCY[opts.provider]
  const amount = opts.pack.prices[currency]
  await db.insert(order).values({
    id,
    userId: opts.userId,
    packId: opts.pack.id,
    credits: opts.pack.credits,
    amount,
    currency,
    provider: opts.provider,
  })

  if (opts.provider === "paddle") {
    const txn = await createTransaction({ orderId: id, packName: opts.pack.name, credits: opts.pack.credits, amountUsd: amount })
    if (!txn.checkout?.url) throw new Error("Paddle returned no checkout URL: set a default payment link in Checkout settings")
    await db.update(order).set({ preferenceId: txn.id }).where(eq(order.id, id))
    return txn.checkout.url
  }

  const pref = await createPreference({
    orderId: id,
    title: `Saywhat · ${opts.pack.credits} video credits`,
    price: amount,
    currency,
    payerEmail: opts.email,
    appUrl: opts.appUrl,
  })
  await db.update(order).set({ preferenceId: pref.id }).where(eq(order.id, id))
  return pref.init_point
}

/** A provider payment, normalized. `amount` is in whole currency units, like `order.amount`. */
export type ProviderPayment = {
  provider: Provider
  /** provider payment id (MP payment id / Paddle transaction id), stored in `order.payment_id` */
  id: string
  orderId: string | null
  /** raw provider status, mirrored into `order.status` */
  status: string
  /** true when the money is in: the only state that grants credits */
  paid: boolean
  amount: number
  currency: string
  /** when set, must equal the checkout id stored on the order (`order.preference_id`) */
  checkoutId?: string
}

export type SyncResult =
  | { ok: true; status: string; paid: boolean; credited: boolean; orderId: string; userId: string }
  | { ok: false; reason: "unknown_order" | "mismatch" }

/**
 * Reconciles one provider payment with its order. Safe to call any number of times, from webhooks and
 * from the buyer's return redirect, for either provider: credits are granted once, guarded by `credited_at`.
 */
export async function applyPayment(p: ProviderPayment): Promise<SyncResult> {
  if (!p.orderId) return { ok: false, reason: "unknown_order" }
  const o = await db.query.order.findFirst({ where: eq(order.id, p.orderId) })
  if (!o || o.provider !== p.provider) return { ok: false, reason: "unknown_order" }
  // never trust the amount a payment claims for itself: it must match what we priced, for this very checkout
  const sameCheckout = p.checkoutId === undefined || p.checkoutId === o.preferenceId
  if (!sameCheckout || p.currency !== o.currency || Math.round(p.amount * 100) !== o.amount * 100) {
    await db.update(order).set({ status: "mismatch", paymentId: p.id }).where(eq(order.id, o.id))
    return { ok: false, reason: "mismatch" }
  }

  let credited = false
  await db.transaction(async (tx) => {
    // track the latest attempt (a retry after a rejection gets a new payment id); once credited, only that payment updates it
    if (o.creditedAt == null || o.paymentId === p.id) await tx.update(order).set({ status: p.status, paymentId: p.id }).where(eq(order.id, o.id))
    if (!p.paid) return
    const claimed = await tx
      .update(order)
      .set({ creditedAt: new Date() })
      .where(and(eq(order.id, o.id), isNull(order.creditedAt)))
      .returning({ id: order.id })
    if (!claimed.length) return
    await tx.update(user).set({ credits: sql`${user.credits} + ${o.credits}` }).where(eq(user.id, o.userId))
    await tx.insert(creditLedger).values({ userId: o.userId, delta: o.credits, reason: "purchase", note: o.id })
    credited = true
  })
  return { ok: true, status: p.status, paid: p.paid, credited, orderId: o.id, userId: o.userId }
}

export const fromMercadoPago = (p: Payment): ProviderPayment => ({
  provider: "mercadopago",
  id: p.id,
  orderId: p.external_reference ?? null,
  status: p.status,
  paid: p.status === "approved",
  amount: p.transaction_amount,
  currency: p.currency_id,
})

export const fromPaddle = (t: Transaction): ProviderPayment => ({
  provider: "paddle",
  id: t.id,
  orderId: typeof t.custom_data?.order_id === "string" ? t.custom_data.order_id : null,
  status: t.status,
  paid: isPaid(t.status),
  amount: transactionAmount(t),
  currency: t.currency_code,
  checkoutId: t.id,
})

/** Fetches a Mercado Pago payment from the API (never trust the notification body) and applies it. */
export async function syncMercadoPagoPayment(paymentId: string, fetchPayment: (id: string) => Promise<Payment> = getPayment) {
  return applyPayment(fromMercadoPago(await fetchPayment(paymentId)))
}

/** Fetches a Paddle transaction from the API (its latest state, whatever order webhooks arrive in) and applies it. */
export async function syncPaddleTransaction(transactionId: string, fetchTransaction: (id: string) => Promise<Transaction> = getTransaction) {
  return applyPayment(fromPaddle(await fetchTransaction(transactionId)))
}
