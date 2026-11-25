"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { CaptionCanvas } from "@/components/saywhat/caption-text"
import { Reveal } from "@/components/site/motion/reveal"
import { PRESETS } from "@/lib/captions/presets"
import type { Word } from "@/lib/captions/types"

/** "Your turn." as a timed caption; the loop replays it like a clip. */
const WORDS: Word[] = [
  { w: "Your", s: 0.35, e: 0.75 },
  { w: "turn.", s: 0.8, e: 1.5 },
]
const LOOP = 3.4
/** server HTML / reduced motion: both words on screen, settled */
const STILL = 1.6
const STYLE = { ...PRESETS[0].style, size: 62, position: 12, wordsPerLine: 2 }

/** Full-bleed dark band with the CTA phrase "spoken" as a giant Creator caption while in view. */
export function FinalCta({ freeCredits }: { freeCredits: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(STILL)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // a synthetic clip clock: this band has no video, so time is the loop position
    let id = 0
    let t0 = 0
    const tick = (now: number) => {
      if (!t0) t0 = now
      setT(((now - t0) / 1000) % LOOP)
      id = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(id)
      t0 = 0
      if (e.isIntersecting) id = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(id)
    }
  }, [])

  return (
    <section className="screen relative overflow-hidden border-t border-white/10">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[30rem] w-[30rem] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,225,77,0.15) 0%, transparent 60%)" }} />
      </div>
      <div ref={ref} className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-5 py-20 text-center sm:px-6 sm:py-28">
        {/* the caption canvas fills this box, which acts as the "frame" */}
        <Reveal>
          <div className="relative h-[clamp(5rem,16vw,12rem)] w-full">
            <CaptionCanvas words={WORDS} t={t} style={STYLE} label="Your turn." />
          </div>
        </Reveal>
        <p className="text-muted-foreground max-w-md text-lg text-pretty">
          Bring your own clip. The first {freeCredits} are on us, no card needed.
        </p>
        <Link
          href="/signup"
          className="group shine-btn bg-primary text-primary-foreground focus-visible:ring-ring relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-md px-6 text-base font-semibold transition-colors outline-none hover:bg-[#ffe97a] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Caption your first video
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
