import Link from "next/link"
import { FREE_CREDITS } from "@/lib/billing/packs"
import { MAX_SECONDS } from "@/lib/pipeline"
import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"
import { Stagger, StaggerItem } from "@/components/site/motion/stagger"

const FAQ = [
  {
    q: "What counts as one credit?",
    a: `One video, up to ${MAX_SECONDS / 60} minutes long. Editing, restyling and re-exporting that video after it's transcribed doesn't cost anything extra.`,
  },
  {
    q: "Do you upload my video?",
    a: "No. It's decoded and rendered in your browser. Only a compressed audio track goes to the speech-to-text service, and it isn't stored.",
  },
  {
    q: "Which languages work?",
    a: "Spanish, English, Portuguese and most other major languages. You don't pick one: it's detected automatically.",
  },
  {
    q: "How do I pay?",
    a: "Card checkout. In Argentina you can also pay with Mercado Pago. Credits land in your account as soon as the payment's approved.",
  },
  {
    q: "What if a transcription fails?",
    a: "If we can't transcribe a video, or there's no speech in it, the credit goes straight back to your balance. You don't have to ask.",
  },
  {
    q: "Do credits expire?",
    a: "No. Buy a pack once and use it next week or next year.",
  },
  {
    q: "Is there a subscription?",
    a: "No. There's nothing to cancel because there's nothing recurring. You buy videos, not months.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <RevealHeading text="Things you'd ask *before paying.*" className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl" />
          <Reveal delay={0.1}>
          <p className="text-muted-foreground max-w-sm text-lg leading-relaxed">
            Anything else? Your first {FREE_CREDITS} videos are free, so the quickest answer might be{" "}
            <Link href="/signup" className="text-foreground underline decoration-1 underline-offset-4 hover:decoration-2">
              trying it
            </Link>
            .
          </p>
          </Reveal>
        </div>
        <Stagger>
        <div className="border-t border-white/25">
          {FAQ.map((f, i) => (
            <StaggerItem as="div" key={f.q}>
            <details className="group border-b py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-baseline gap-4 rounded-sm text-left text-[17px] font-medium outline-none focus-visible:ring-2">
                <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{f.q}</span>
                <span aria-hidden className="text-muted-foreground font-mono text-lg leading-none transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 pr-8 pl-10 leading-relaxed">{f.a}</p>
            </details>
            </StaggerItem>
          ))}
        </div>
        </Stagger>
      </div>
    </section>
  )
}
