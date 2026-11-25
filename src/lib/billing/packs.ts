/**
 * Credit packs sold through checkout. 1 credit = 1 captioned video (up to 2 minutes).
 * Every pack has a USD price (international checkout with Paddle) and an ARS price (Mercado Pago, Argentina).
 * Prices are whole units of their currency (dollars / pesos): orders store them as integers.
 */
export const CURRENCIES = ["USD", "ARS"] as const
export type Currency = (typeof CURRENCIES)[number]
export const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency)

export const FREE_CREDITS = 3

export type Pack = {
  id: string
  name: string
  credits: number
  prices: Record<Currency, number>
  blurb: string
  popular?: boolean
}

export const PACKS: Pack[] = [
  { id: "starter", name: "Starter", credits: 10, prices: { USD: 5, ARS: 4900 }, blurb: "Try it on a week of posts." },
  { id: "creator", name: "Creator", credits: 40, prices: { USD: 15, ARS: 14900 }, blurb: "For a steady posting schedule.", popular: true },
  { id: "studio", name: "Studio", credits: 120, prices: { USD: 35, ARS: 34900 }, blurb: "For teams and agencies." },
]

export const findPack = (id: string) => PACKS.find((p) => p.id === id)

const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  ARS: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }),
}
// per-video prices in dollars are cents (e.g. $0.38), so they keep two decimals
const perVideoFormatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ARS: formatters.ARS,
}

export const formatPrice = (n: number, currency: Currency = "USD") => formatters[currency].format(n)
export const perVideo = (p: Pack, currency: Currency = "USD") => {
  const each = p.prices[currency] / p.credits
  return perVideoFormatters[currency].format(currency === "ARS" ? Math.round(each) : Math.round(each * 100) / 100)
}
