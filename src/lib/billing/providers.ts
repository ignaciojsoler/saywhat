import "server-only"
import { mpConfigured } from "./mercadopago"
import { paddleConfigured } from "./paddle"
import type { Provider } from "./orders"

/** Providers with credentials on this server, international (USD) first. */
export function configuredProviders(): Provider[] {
  const list: Provider[] = []
  if (paddleConfigured()) list.push("paddle")
  if (mpConfigured()) list.push("mercadopago")
  return list
}

/**
 * Which checkout a buyer gets: their explicit choice if available; otherwise Mercado Pago (ARS) for
 * visitors from Argentina and Paddle (USD) for everyone else, falling back to whatever is configured.
 */
export function pickProvider(opts: { requested?: string | null; country?: string | null; available?: Provider[] }): Provider | null {
  const available = opts.available ?? configuredProviders()
  const requested = opts.requested === "ars" ? "mercadopago" : opts.requested === "usd" ? "paddle" : null
  if (requested && available.includes(requested)) return requested
  if (opts.country?.toUpperCase() === "AR" && available.includes("mercadopago")) return "mercadopago"
  return available[0] ?? null
}
