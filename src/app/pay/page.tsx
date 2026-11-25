import type { Metadata } from "next"
import { Logo } from "@/components/site/logo"
import { PaddleCheckout } from "./paddle-checkout"

export const metadata: Metadata = { title: "Checkout · Saywhat", robots: { index: false } }

/**
 * /pay — Paddle's "default payment link". Transactions created by the server get a checkout URL pointing
 * here with `?_ptxn=<transaction id>`; Paddle.js embeds the payment form in this page (inline checkout)
 * next to our own order summary.
 */
export default function PayPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 py-8 sm:py-12">
      <div className="mb-10 w-full max-w-5xl sm:mb-14">
        <Logo />
      </div>
      <PaddleCheckout token={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""} />
    </main>
  )
}
