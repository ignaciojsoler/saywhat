"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Reveal } from "@/components/site/motion/reveal"
import { HeroDropzone } from "./hero-dropzone"

const CHROME_TEXT = {
  background: "linear-gradient(100deg, #f5f5f5 0%, #8a8a8a 22%, #ffffff 38%, #6b6b6b 55%, #e8e8e8 72%, #9a9a9a 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const

/**
 * Closing band. Mirrors the hero: same type, same chrome accent and the same dropzone,
 * so a visitor who scrolled the whole page can start right here (v0/Linear-style repeat CTA).
 */
export function FinalCta({ freeCredits }: { freeCredits: number }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/10 bg-black">
      {/* a soft studio light from above, like the chrome's key light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-5 py-24 text-center sm:px-6 sm:py-32">
        <Reveal>
          <h2
            className="font-hero text-[clamp(3.2rem,9vw,7.5rem)] leading-[0.9] font-extrabold tracking-[-0.035em] text-white"
            style={{ fontStretch: "112%", fontVariationSettings: '"wdth" 112' }}
          >
            Your{" "}
            <span className="hero-chrome-word pr-[0.06em] italic" style={CHROME_TEXT}>
              turn.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="max-w-md text-lg text-pretty text-white/65">
            Drop a clip and watch it caption itself. The first {freeCredits} are on us, no card needed.
          </p>
        </Reveal>

        <Reveal delay={0.16} className="flex w-full max-w-xl flex-col items-center gap-5">
          <div className="w-full text-left">
            <HeroDropzone />
          </div>
          <Link href="/signup" className="group inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white">
            Or create your free account first
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
