"use client"

import { useEffect, useRef } from "react"
import { ClipCaption, PhoneFrame, SampleVideo } from "@/components/saywhat/sample-clip"
import { playMuted, prefersReducedMotion, useVideoTime } from "@/components/saywhat/use-video-time"
import { PRESETS } from "@/lib/captions/presets"
import { FONTS } from "@/lib/captions/types"
import { RevealHeading } from "./reveal-heading"

/** Max drift (s) tolerated between a follower phone and the master clock before re-seeking. */
const DRIFT = 0.12

/**
 * The same clip five times, one phone per preset. The first video is the clock: its time drives
 * every caption, the other videos are nudged back in sync, and all of them pause off-screen.
 */
export function StyleGallery() {
  const rootRef = useRef<HTMLDivElement>(null)
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const master = useRef<HTMLVideoElement | null>(null)
  const { t } = useVideoTime(master)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const all = () => videos.current.filter((v): v is HTMLVideoElement => !!v)
    if (prefersReducedMotion()) {
      for (const v of all()) v.currentTime = 1.5
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        for (const v of all()) {
          if (e.isIntersecting) {
            v.preload = "auto"
            playMuted(v)
          } else v.pause()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(root)
    // keep followers on the master's clock (loops and buffering make them drift apart)
    const sync = window.setInterval(() => {
      const m = master.current
      if (!m || m.paused) return
      for (const v of all()) if (v !== m && Math.abs(v.currentTime - m.currentTime) > DRIFT) v.currentTime = m.currentTime
    }, 400)
    return () => {
      io.disconnect()
      clearInterval(sync)
    }
  }, [])

  return (
    <section id="styles" className="screen scroll-mt-16 border-y border-white/10 py-20 sm:py-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 sm:px-6 md:flex-row md:items-end md:justify-between md:gap-12">
        <RevealHeading text="One clip. Five ways to *say* it." className="font-display max-w-2xl text-5xl text-balance font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl" />
        <p className="text-muted-foreground max-w-sm text-pretty md:pb-2">
          Same 15 seconds, same transcript, five presets. Each one&apos;s a starting point: font, color, size and position are
          all yours to change.
        </p>
      </div>

      <div ref={rootRef} className="mx-auto mt-12 w-full max-w-6xl">
        <ul className="flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:px-6 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {PRESETS.map((p, i) => (
            <li key={p.id} className="flex w-[46vw] max-w-[220px] shrink-0 snap-start flex-col gap-3 sm:w-[30vw] lg:w-auto lg:max-w-none">
              <PhoneFrame className="w-full rounded-[1.1rem] [&>div]:rounded-[0.8rem]">
                <SampleVideo
                  autoPlay={false}
                  preload="metadata"
                  ref={(el) => {
                    videos.current[i] = el
                    if (i === 0) master.current = el
                  }}
                />
                <ClipCaption t={t} style={p.style} />
              </PhoneFrame>
              <div className="flex items-baseline justify-between gap-2 border-t border-white/15 pt-2">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="text-muted-foreground font-mono text-xs">{FONTS[p.style.font].label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
