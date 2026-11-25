"use client"

import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeftIcon, LockIcon } from "lucide-react"
import { PACKS } from "@/lib/billing/packs"

/** The slice of the Paddle.js v2 global we use. https://developer.paddle.com/paddlejs/overview */
type Totals = { subtotal?: number | string; tax?: number | string; discount?: number | string; total?: number | string }
type PaddleEvent = {
  name?: string
  data?: {
    currency_code?: string
    items?: { price_name?: string; product?: { name?: string }; quantity?: number }[]
    totals?: Totals
  }
}
type PaddleGlobal = {
  Environment: { set: (env: "sandbox" | "production") => void }
  Initialize: (opts: {
    token: string
    eventCallback?: (e: PaddleEvent) => void
    checkout?: { settings?: Record<string, unknown> }
  }) => void
}

type Summary = { item: string; credits?: number; currency: string; subtotal: number; tax: number; discount: number; total: number }

/** Paddle.js events report totals as numbers in major units; tolerate API-style minor-unit strings too. */
const amount = (v: number | string | undefined) => (typeof v === "string" ? Number(v) / 100 : (v ?? 0))

function summarize(e: PaddleEvent): Summary | null {
  const d = e.data
  if (!d?.totals) return null
  const item = d.items?.[0]?.price_name ?? d.items?.[0]?.product?.name ?? "Video credits"
  // prices are named "<Pack> pack" (see createTransaction)
  const pack = PACKS.find((p) => item.toLowerCase().startsWith(p.name.toLowerCase()))
  return {
    item,
    credits: pack?.credits,
    currency: d.currency_code ?? "USD",
    subtotal: amount(d.totals.subtotal),
    tax: amount(d.totals.tax),
    discount: amount(d.totals.discount),
    total: amount(d.totals.total),
  }
}

// not "paddle-frame": Paddle.js removes elements with that class (it names its own iframes so)
const FRAME = "saywhat-checkout"

export function PaddleCheckout({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<"loading" | "open" | "error">(token ? "loading" : "error")
  const [summary, setSummary] = useState<Summary | null>(null)

  function init() {
    const Paddle = (window as unknown as { Paddle?: PaddleGlobal }).Paddle
    const txn = new URLSearchParams(window.location.search).get("_ptxn")
    if (!Paddle || !token || !txn) return setState("error")
    // sandbox client-side tokens start with test_, live ones with live_
    if (token.startsWith("test_")) Paddle.Environment.set("sandbox")
    const back = new URL("/api/checkout/return", window.location.origin)
    back.searchParams.set("provider", "paddle")
    back.searchParams.set("txn", txn)
    let completed = false
    // Paddle.js opens the checkout for ?_ptxn by itself, with these settings: embedded in our page
    // (inline), so the order summary below is ours and Paddle only renders the payment form.
    Paddle.Initialize({
      token,
      checkout: {
        settings: {
          displayMode: "inline",
          variant: "one-page",
          frameTarget: FRAME,
          frameInitialHeight: "450",
          frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
          theme: "dark",
          allowLogout: false,
          successUrl: back.toString(),
        },
      },
      eventCallback: (e) => {
        if (e.name === "checkout.loaded") setState("open")
        if (e.name === "checkout.loaded" || e.name === "checkout.updated") {
          const s = summarize(e)
          if (s) setSummary(s)
        }
        // after paying, Paddle redirects to successUrl itself
        if (e.name === "checkout.completed") completed = true
        if (e.name === "checkout.closed" && !completed) router.push("/app/credits?purchase=cancelled")
      },
    })
  }

  if (state === "error")
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="font-medium">We couldn&apos;t open the checkout.</p>
        <Link href="/app/credits" className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4">
          Back to credits
        </Link>
      </div>
    )

  return (
    <>
      {token && <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onReady={init} onError={() => setState("error")} />}
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        <OrderSummary summary={summary} />
        <section aria-label="Payment" className="relative min-h-[450px] min-w-0">
          {state === "loading" && <FrameSkeleton />}
          <div className={FRAME} />
        </section>
      </div>
    </>
  )
}

function OrderSummary({ summary: s }: { summary: Summary | null }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: s?.currency ?? "USD" }).format(n)
  return (
    <aside className="min-w-0 lg:pt-4">
      <Link
        href="/app/credits"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to packs
      </Link>
      <p className="text-muted-foreground text-sm">You&apos;re buying</p>
      {s ? (
        <>
          <h1 className="font-hero mt-1 text-4xl tracking-tight sm:text-5xl" style={{ fontStretch: "112%" }}>
            {s.credits ? (
              <>
                <span className="text-primary">{s.credits}</span> videos
              </>
            ) : (
              s.item
            )}
          </h1>
          {s.credits && <p className="text-muted-foreground mt-2">{s.item}, ready to use the moment you pay.</p>}
          <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
            <Row label="Subtotal" value={fmt(s.subtotal)} />
            {s.discount > 0 && <Row label="Discount" value={`−${fmt(s.discount)}`} />}
            <Row label="Tax" value={fmt(s.tax)} />
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
              <dt className="font-medium">Total due today</dt>
              <dd className="text-2xl font-semibold tabular-nums">{fmt(s.total)}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
            One-time payment, no subscription. Tax is calculated from your country.
          </p>
        </>
      ) : (
        <div className="mt-2 space-y-4" aria-hidden>
          <div className="h-12 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-64 animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-8 h-28 animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      )}
      <p className="text-muted-foreground mt-8 flex items-center gap-2 text-xs">
        <LockIcon className="size-3.5" />
        Secure payment processed by Paddle
      </p>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function FrameSkeleton() {
  return (
    <div className="absolute inset-0 space-y-3 p-1" aria-label="Loading secure checkout">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.05]" />
      ))}
      <div className="h-12 w-full animate-pulse rounded-full bg-white/[0.08]" />
    </div>
  )
}
