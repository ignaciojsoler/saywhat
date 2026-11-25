"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { createCheckout, PROVIDERS, type Provider } from "@/lib/billing/orders"
import { findPack } from "@/lib/billing/packs"
import { configuredProviders } from "@/lib/billing/providers"

export type CheckoutState = { error?: string }

async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

/** Creates an order + the provider's hosted checkout (Paddle in USD, Mercado Pago in ARS) and sends the buyer there. */
export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?next=/app/credits")
  const pack = findPack(String(form.get("pack") ?? ""))
  if (!pack) return { error: "That pack doesn't exist." }
  const provider = String(form.get("provider") ?? "") as Provider
  if (!PROVIDERS.includes(provider)) return { error: "Pick a payment method." }
  if (!configuredProviders().includes(provider)) return { error: "That payment method isn't set up on this server yet." }

  let checkoutUrl: string
  try {
    checkoutUrl = await createCheckout({ userId: session.user.id, email: session.user.email, pack, provider, appUrl: await appUrl() })
  } catch (e) {
    console.error("[checkout]", e)
    return { error: "Couldn't start the checkout. Try again in a moment." }
  }
  redirect(checkoutUrl)
}
