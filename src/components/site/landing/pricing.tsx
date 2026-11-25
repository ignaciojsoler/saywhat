import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FREE_CREDITS, PACKS, formatPrice, perVideo } from "@/lib/billing/packs"
import { MAX_SECONDS } from "@/lib/pipeline"
import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"
import { Stagger, StaggerItem } from "@/components/site/motion/stagger"

type Row = { id: string; name: string; videos: number; price: string; each: string; note: string; href: string; cta: string; popular?: boolean }

const ROWS: Row[] = [
  { id: "free", name: "Free", videos: FREE_CREDITS, price: formatPrice(0), each: "—", note: "On us when you sign up", href: "/signup", cta: "Start free" },
  ...PACKS.map((p) => ({
    id: p.id,
    name: p.name,
    videos: p.credits,
    price: formatPrice(p.prices.USD),
    each: perVideo(p),
    note: p.blurb,
    href: `/app/credits?pack=${p.id}`,
    cta: "Buy",
    popular: p.popular,
  })),
]

/** Pricing as a plain price list, like a rate card: what you get, what it costs, what each video works out to. */
export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="flex flex-col gap-5">
          <RevealHeading text="No subscription. Buy videos, *not months.*" className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl" />
          <Reveal delay={0.1}>
          <p className="text-muted-foreground max-w-sm text-lg leading-relaxed text-pretty">
            One credit captions one video up to {MAX_SECONDS / 60} minutes. Re-styling and re-exporting it is free. Credits don&apos;t
            expire.
          </p>
          </Reveal>
        </div>

        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-lg border">
            <div className="text-muted-foreground hidden grid-cols-[minmax(0,1.7fr)_0.5fr_0.6fr_0.7fr_auto] gap-4 border-b px-5 py-3 font-mono text-xs uppercase sm:grid">
              <span>Pack</span>
              <span className="text-right">Videos</span>
              <span className="text-right">Price</span>
              <span className="text-right">Per video</span>
              <span className="w-20" />
            </div>
            <Stagger>
            <ul className="divide-y">
              {ROWS.map((r) => (
                <StaggerItem as="li"
                  key={r.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-transform sm:grid-cols-[minmax(0,1.7fr)_0.5fr_0.6fr_0.7fr_auto]",
                    r.popular && "bg-paper-2 glow-border hover:-translate-y-0.5",
                  )}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 font-semibold">
                      {r.name}
                      {r.popular && <span className="bg-foreground text-background rounded-[4px] px-1.5 py-0.5 font-mono text-xs whitespace-nowrap uppercase">Most picked</span>}
                    </span>
                    <span className="text-muted-foreground text-sm text-pretty">{r.note}</span>
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums max-sm:hidden">{r.videos}</span>
                  <span className="text-right text-xl font-semibold tabular-nums max-sm:col-start-2 max-sm:row-start-1">{r.price}</span>
                  <span className="text-muted-foreground text-right font-mono text-sm tabular-nums max-sm:hidden">{r.each}</span>
                  <Button
                    asChild
                    size="sm"
                    variant={r.popular ? "default" : "outline"}
                    className="w-20 max-sm:col-span-2 max-sm:mt-2 max-sm:w-full"
                  >
                    <Link href={r.href}>
                      {r.cta}
                      {r.id !== "free" && <span className="sm:hidden">{` ${r.videos} videos · ${r.each} each`}</span>}
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </StaggerItem>
              ))}
            </ul>
            </Stagger>
          </div>
          <p className="text-muted-foreground font-mono text-xs leading-relaxed">
            Prices in USD, card checkout (taxes handled at checkout). In Argentina, pay in pesos with Mercado Pago. Failed
            transcriptions are refunded automatically.
          </p>
        </div>
      </div>
    </section>
  )
}
