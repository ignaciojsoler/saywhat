"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { CaptionText } from "@/components/saywhat/caption-text"
import { PRESETS } from "@/lib/captions/presets"

const WORDS = ["Your", "turn."]
const STYLE = { ...PRESETS[0].style, size: 72 }

/** Full-bleed dark band with the CTA phrase "spoken" as a giant Pop caption while in view. */
export function FinalCta({ freeCredits }: { freeCredits: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // server HTML: last word highlighted, a sensible still frame
  const [active, setActive] = useState(WORDS.length - 1)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // -1 (pause) -> 0 -> 1 -> hold, on a loop
    const beats = [-1, 0, 1, 1, 1, 1, 1]
    let i = 0
    let timer = 0
    const tick = () => {
      setActive(beats[i])
      i = (i + 1) % beats.length
      timer = window.setTimeout(tick, 420)
    }
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(timer)
      if (e.isIntersecting) {
        i = 0
        tick()
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <section className="screen border-t border-white/10">
      <div ref={ref} className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-5 py-20 text-center sm:px-6 sm:py-28">
        {/* CaptionText sizes in cqh: this box is the "frame" */}
        <div className="h-[clamp(4.5rem,15vw,11rem)] w-full [container-type:size]" role="img" aria-label="Your turn.">
          <CaptionText words={WORDS} active={active} style={STYLE} className="leading-none" />
        </div>
        <p className="text-muted-foreground max-w-md text-lg text-pretty">
          Bring your own clip. The first {freeCredits} are on us, no card needed.
        </p>
        <Link
          href="/signup"
          className="group bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-12 items-center gap-2 rounded-md px-6 text-base font-semibold transition-colors outline-none hover:bg-[#ffe97a] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Caption your first video
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
