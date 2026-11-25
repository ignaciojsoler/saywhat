"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Provider } from "@/lib/billing/orders"
import { startCheckout, type CheckoutState } from "./actions"

const OPENING: Record<Provider, string> = { paddle: "Opening checkout…", mercadopago: "Opening Mercado Pago…" }

export function BuyButton(p: { packId: string; provider: Provider | null; label: string; popular?: boolean; highlighted?: boolean }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {})

  useEffect(() => {
    if (state.error) toast.error("Checkout unavailable", { description: state.error })
  }, [state])

  return (
    <form action={action} className="mt-auto">
      <input type="hidden" name="pack" value={p.packId} />
      {p.provider && <input type="hidden" name="provider" value={p.provider} />}
      <Button
        type="submit"
        // a ?pack= link from the landing page highlights that pack
        variant={p.popular || p.highlighted ? "default" : "secondary"}
        className={cn("h-11 w-full text-[15px]", p.highlighted && "ring-primary/40 ring-offset-card ring-2 ring-offset-2")}
        disabled={pending || !p.provider}
      >
        {pending && <Spinner />}
        {pending && p.provider ? OPENING[p.provider] : p.label}
      </Button>
    </form>
  )
}

const NOTICES = {
  success: {
    icon: CheckCircle2Icon,
    tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    title: "Payment approved",
    text: "Your credits are ready. Go caption something.",
  },
  pending: {
    icon: ClockIcon,
    tone: "border-primary/30 bg-primary/10 text-primary",
    title: "Payment pending",
    text: "The payment is still being confirmed. Credits are added automatically once it goes through.",
  },
  failure: {
    icon: XCircleIcon,
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    title: "Payment declined",
    text: "Nothing was charged. Try another card or payment method.",
  },
  cancelled: {
    icon: XCircleIcon,
    tone: "border-border bg-card text-muted-foreground",
    title: "Checkout cancelled",
    text: "No worries, nothing was charged.",
  },
  error: {
    icon: XCircleIcon,
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    title: "We couldn't confirm the payment",
    text: "If you were charged, credits will appear within a few minutes once the payment provider notifies us.",
  },
} as const

/** Banner shown after returning from checkout (?purchase=success|pending|failure|cancelled|error). */
export function PurchaseNotice() {
  const params = useSearchParams()
  const router = useRouter()
  const key = params.get("purchase") as keyof typeof NOTICES | null
  const n = key ? NOTICES[key] : null

  // while a payment is pending, refresh the balance for a minute so credits show up without a reload
  useEffect(() => {
    if (key !== "pending") return
    let ticks = 0
    const id = setInterval(() => {
      router.refresh()
      if (++ticks >= 15) clearInterval(id)
    }, 4000)
    return () => clearInterval(id)
  }, [key, router])

  if (!n) return null
  const Icon = n.icon
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border px-5 py-4", n.tone)}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-medium">{n.title}</p>
        <p className="text-sm opacity-85">{n.text}</p>
      </div>
      {key === "success" ? (
        <Button size="sm" onClick={() => router.push("/app/new")}>
          New video
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => router.replace("/app/credits")}>
          Dismiss
        </Button>
      )}
    </div>
  )
}
