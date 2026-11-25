"use client"

import { useEffect, useRef, useState } from "react"
import { CaptionCanvas } from "@/components/saywhat/caption-text"
import { DEMO_POSTER, DEMO_WORDS, PhoneFrame, SampleVideo, demoStyle } from "@/components/saywhat/sample-clip"
import { playMuted, prefersReducedMotion, useVideoTime } from "@/components/saywhat/use-video-time"
import { PRESETS } from "@/lib/captions/presets"
import { FONTS } from "@/lib/captions/types"
import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"
import { Stagger, StaggerItem } from "@/components/site/motion/stagger"

const COUNT = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]

/**
 * The same clip once per preset. A single hidden <video> is decoded and every phone paints its
 * frame onto a canvas together with the captions, exactly like the export does. One decoder
 * instead of eight keeps the section light, and the phones can't drift out of sync.
 */
export function StyleGallery() {
  const rootRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const { t } = useVideoTime(ref)

  useEffect(() => {
    const root = rootRef.current
    const v = ref.current
    if (!root || !v) return
    setVideo(v)
    if (prefersReducedMotion()) {
      v.preload = "auto"
      v.currentTime = 7.5
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          v.preload = "auto"
          playMuted(v)
        } else v.pause()
      },
      { threshold: 0.15 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  return (
    <section id="styles" className="screen scroll-mt-16 border-y border-white/10 py-20 sm:py-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 sm:px-6 md:flex-row md:items-end md:justify-between md:gap-12">
        <RevealHeading
          text={`One clip. ${COUNT[PRESETS.length] ?? PRESETS.length} ways to *say* it.`}
          className="font-display max-w-2xl text-5xl text-balance font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl"
        />
        <Reveal delay={0.1}>
          <p className="text-muted-foreground max-w-sm text-pretty md:pb-2">
            Same clip, same transcript, {PRESETS.length} presets. Each one&apos;s a starting point: font, motion, color and position
            are all yours to change.
          </p>
        </Reveal>
      </div>

      <div ref={rootRef} className="relative mx-auto mt-12 w-full max-w-6xl">
        {/* the shared clock and frame source; painted by every phone below */}
        <SampleVideo ref={ref} autoPlay={false} preload="metadata" className="pointer-events-none !size-px opacity-0" />
        <Stagger>
        <ul className="flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:px-6 lg:grid lg:grid-cols-4 lg:gap-x-5 lg:gap-y-8 lg:overflow-visible lg:pb-0">
          {PRESETS.map((p) => (
            <StaggerItem as="li" key={p.id} className="flex w-[46vw] max-w-[220px] shrink-0 snap-start flex-col gap-3 sm:w-[30vw] lg:w-auto lg:max-w-none">
              <PhoneFrame className="style-card glow-border w-full rounded-[1.1rem] [&>div]:rounded-[0.8rem] transition-transform duration-300 hover:-translate-y-1">
                <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${DEMO_POSTER})` }} />
                <CaptionCanvas words={DEMO_WORDS} t={t} style={demoStyle(p.style)} video={video} paintVideo label={`${p.name} caption style`} />
              </PhoneFrame>
              <div className="flex flex-col gap-0.5 border-t border-white/15 pt-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{FONTS[p.style.font].label}</span>
                </div>
                <span className="text-muted-foreground text-xs text-pretty">{p.tagline}</span>
              </div>
            </StaggerItem>
          ))}
        </ul>
        </Stagger>
      </div>
    </section>
  )
}
