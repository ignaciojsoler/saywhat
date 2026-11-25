"use client"

import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"

/** The slice of the Paddle.js v2 global we use. https://developer.paddle.com/paddlejs/overview */
type PaddleEvent = { name?: string }
type PaddleGlobal = {
  Environment: { set: (env: "sandbox" | "production") => void }
  Initialize: (opts: {
    token: string
    eventCallback?: (e: PaddleEvent) => void
    checkout?: { settings?: Record<string, unknown> }
  }) => void
}

export function PaddleCheckout({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<"loading" | "open" | "error">(token ? "loading" : "error")

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
    // Paddle.js opens the checkout for ?_ptxn by itself, with these settings
    Paddle.Initialize({
      token,
      checkout: { settings: { displayMode: "overlay", theme: "dark", allowLogout: false, successUrl: back.toString() } },
      eventCallback: (e) => {
        if (e.name === "checkout.loaded") setState("open")
        // after paying, Paddle redirects to successUrl itself
        if (e.name === "checkout.completed") completed = true
        // closing the overlay without paying: back to the packs
        if (e.name === "checkout.closed" && !completed) router.push("/app/credits?purchase=cancelled")
      },
    })
  }

  return (
    <>
      {token && <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onReady={init} onError={() => setState("error")} />}
      {state === "error" ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-medium">We couldn&apos;t open the checkout.</p>
          <Link href="/app/credits" className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4">
            Back to credits
          </Link>
        </div>
      ) : (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          {state === "loading" ? "Opening secure checkout…" : "Complete your purchase in the checkout window."}
        </p>
      )}
    </>
  )
}
