"use client"

import type { Ref } from "react"
import { CaptionCanvas } from "./caption-text"
import { PROMO_WORDS } from "@/lib/captions/promo-transcript"
import type { CaptionStyle, Word } from "@/lib/captions/types"
import { cn } from "@/lib/utils"

/** Landing demo clip: the promo (1080x1920, 26.3 s). Its bottom ~30% is kept clear for captions. */
export const DEMO_SRC = "/promo.mp4"
export const DEMO_POSTER = "/promo-poster.jpg"
export const DEMO_WORDS = PROMO_WORDS

/**
 * Presets place captions for real footage; on the demo clip they all sit in the reserved
 * bottom band (below y≈1300 of 1920), so the clip's own content stays readable.
 */
export const demoStyle = (style: CaptionStyle): CaptionStyle => ({ ...style, position: 10 })

/**
 * Phone with a 9:16 screen sized in container units for the captions. `chrome` gives it a
 * polished metal bezel (the hero device); the default is a plain black bezel (gallery cards).
 */
export function PhoneFrame({ className, chrome = false, children }: { className?: string; chrome?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn("rounded-[1.6rem] p-[3.5%]", chrome ? "phone-chrome" : "bg-black ring-1 ring-white/10", className)}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.25rem] bg-[#0b0b0a] [container-type:inline-size]">{children}</div>
    </div>
  )
}

/** The demo clip, filling the frame. */
export function SampleVideo({
  ref,
  className,
  preload = "auto",
  autoPlay = true,
}: {
  ref?: Ref<HTMLVideoElement>
  className?: string
  preload?: "auto" | "metadata" | "none"
  autoPlay?: boolean
}) {
  return (
    <video
      ref={ref}
      src={DEMO_SRC}
      poster={DEMO_POSTER}
      muted
      loop
      playsInline
      autoPlay={autoPlay}
      preload={preload}
      aria-label="Saywhat promo: upload a clip, pick a caption style, export"
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  )
}

/** Captions for time `t` over the demo clip, rendered exactly like the export. */
export function ClipCaption({
  t,
  style,
  words = DEMO_WORDS,
  video,
}: {
  t: number
  style: CaptionStyle
  words?: Word[]
  /** the clip under the captions, for the glass preset's backdrop blur */
  video?: HTMLVideoElement | null
}) {
  return <CaptionCanvas words={words} t={t} style={demoStyle(style)} video={video} />
}
