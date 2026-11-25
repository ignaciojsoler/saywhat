import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { desc, eq } from "drizzle-orm"
import { CheckIcon, ShieldCheckIcon } from "lucide-react"
import { db } from "@/db"
import { creditLedger } from "@/db/schema"
import { Page, PageHeader } from "@/components/shell/page-header"
import { headers } from "next/headers"
import { BuyButton, PurchaseNotice } from "./client"
import { requireAccount } from "@/lib/session"
import { FREE_CREDITS, PACKS, formatPrice, perVideo, type Currency } from "@/lib/billing/packs"
import { PROVIDER_CURRENCY, type Provider } from "@/lib/billing/orders"
import { configuredProviders, pickProvider } from "@/lib/billing/providers"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Credits · Saywhat" }

export default function CreditsPage({ searchParams }: PageProps<"/app/credits">) {
  return (
    <Page className="gap-12">
      <PageHeader title="Credits & billing" description="1 credit captions 1 video. Credits never expire." />

      <Suspense>
        <PurchaseNotice />
      </Suspense>

      <section className="flex flex-col gap-6" aria-labelledby="buy-credits">
        <h2 id="buy-credits" className="text-xl font-semibold tracking-tight">
          Buy credits
        </h2>
        <Suspense fallback={<PacksSkeleton />}>
          <Packs searchParams={searchParams} />
        </Suspense>
      </section>

      <Suspense fallback={<HistorySkeleton />}>
        <History />
      </Suspense>
    </Page>
  )
}

const METHOD: Record<Provider, { label: string; hint: string; note: string }> = {
  paddle: {
    label: "Pay in USD",
    hint: "Card, Apple Pay, Google Pay",
    note: "Secure checkout by Paddle, our reseller. Prices in US dollars; sales tax or VAT is added where required.",
  },
  mercadopago: {
    label: "Pay in ARS",
    hint: "Mercado Pago",
    note: "Secure checkout with Mercado Pago. Card, debit or account balance. Prices in Argentine pesos, taxes included.",
  },
}

/** Pack cards priced for the buyer: USD via Paddle by default, ARS via Mercado Pago for Argentina (or on request). */
async function Packs({ searchParams }: Pick<PageProps<"/app/credits">, "searchParams">) {
  const [params, h] = await Promise.all([searchParams, headers()])
  const available = configuredProviders()
  const pay = typeof params.pay === "string" ? params.pay : null
  const provider = pickProvider({ requested: pay, country: h.get("x-vercel-ip-country"), available })
  const currency: Currency = provider ? PROVIDER_CURRENCY[provider] : "USD"
  const pack = typeof params.pack === "string" ? params.pack : null

  return (
    <div className="flex flex-col gap-6">
      {available.length > 1 && provider && (
        <nav aria-label="Payment currency" className="bg-card flex w-full gap-1 self-start rounded-xl border p-1 sm:w-auto">
          {available.map((p) => (
            <Link
              key={p}
              href={{ query: { ...(pack ? { pack } : {}), pay: PROVIDER_CURRENCY[p].toLowerCase() } }}
              replace
              scroll={false}
              aria-current={p === provider ? "true" : undefined}
              className={cn(
                "flex flex-1 flex-col rounded-lg px-4 py-2 text-left transition-colors sm:flex-none",
                p === provider ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-sm font-medium">{METHOD[p].label}</span>
              <span className="text-xs opacity-75">{METHOD[p].hint}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {PACKS.map((p) => (
          <div
            key={p.id}
            className={cn(
              "bg-card relative flex flex-col gap-6 rounded-2xl border p-7",
              p.popular && "border-primary/60 shadow-[0_0_0_1px_var(--color-primary),0_30px_80px_-40px_rgb(255_225_77/0.45)]",
            )}
          >
            {p.popular && (
              <span className="bg-primary text-primary-foreground absolute -top-3 left-7 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                Most popular
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="text-muted-foreground text-sm">{p.blurb}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatPrice(p.prices[currency], currency)}</span>
              <span className="text-muted-foreground text-sm">
                {p.credits} videos · {perVideo(p, currency)} each
              </span>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {[`${p.credits} video credits`, "All styles and exports", "No expiry"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckIcon className="text-primary size-4" />
                  {t}
                </li>
              ))}
            </ul>
            <BuyButton
              packId={p.id}
              provider={provider}
              label={`Buy ${p.credits} credits`}
              popular={p.popular}
              highlighted={pack === p.id}
            />
          </div>
        ))}
      </div>

      <p className="text-muted-foreground flex items-center justify-center gap-2 text-center text-sm">
        <ShieldCheckIcon className="size-4 shrink-0" />
        {provider ? METHOD[provider].note : "Payments aren't set up on this server yet."}
      </p>
    </div>
  )
}

function PacksSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PACKS.map((p) => (
        <div key={p.id} className="bg-card h-[22rem] animate-pulse rounded-2xl border" />
      ))}
    </div>
  )
}

const REASON: Record<string, string> = {
  welcome: "Welcome gift",
  purchase: "Credit pack",
  video: "Video captioned",
  refund: "Refund (transcription failed)",
}

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" })

async function History() {
  const account = await requireAccount("/app/credits")
  const rows = await db.query.creditLedger.findMany({
    where: eq(creditLedger.userId, account.id),
    orderBy: [desc(creditLedger.createdAt), desc(creditLedger.id)],
    limit: 50,
  })

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Activity</h2>
          <p className="text-muted-foreground text-sm">Your last 50 balance changes.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums">{account.credits}</div>
          <div className="text-muted-foreground text-xs">credits available</div>
        </div>
      </div>
      <div className="bg-card overflow-hidden rounded-2xl border">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">Nothing here yet. You started with {FREE_CREDITS} free credits.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{REASON[r.reason] ?? r.reason}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {dateFmt.format(r.createdAt)}
                    {r.reason !== "purchase" && r.note ? ` · ${r.note}` : ""}
                  </span>
                </div>
                <span className={cn("font-mono text-sm tabular-nums", r.delta > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                  {r.delta > 0 ? `+${r.delta}` : r.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function HistorySkeleton() {
  return (
    <section className="flex flex-col gap-5">
      <div className="bg-muted h-6 w-32 animate-pulse rounded" />
      <div className="bg-card h-48 animate-pulse rounded-2xl border" />
    </section>
  )
}
