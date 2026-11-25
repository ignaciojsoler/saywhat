import type { Metadata } from "next"
import { Logo } from "@/components/site/logo"
import { PaddleCheckout } from "./paddle-checkout"

export const metadata: Metadata = { title: "Checkout · Saywhat", robots: { index: false } }

/**
 * /pay — Paddle's "default payment link". Transactions created by the server get a checkout URL pointing
 * here with `?_ptxn=<transaction id>`, and Paddle.js opens the checkout for it.
 */
export default function PayPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <Logo />
      <PaddleCheckout token={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""} />
    </main>
  )
}
