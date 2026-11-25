"use client"

import type { Ref } from "react"
import { CaptionCanvas } from "./caption-text"
import { DEMO_CLIP_WORDS } from "@/lib/captions/demo-transcript"
import type { CaptionStyle, Word } from "@/lib/captions/types"
import { cn } from "@/lib/utils"

/** Landing demo clip: two creators talking to camera (silent, 540x960, 20.5 s), captioned live. */
export const DEMO_SRC = "/demo-clip.mp4"
export const DEMO_POSTER = "/demo-poster.jpg"
export const DEMO_WORDS = DEMO_CLIP_WORDS

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
      aria-label="Two creators talking to camera, captioned by Saywhat"
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
  return <CaptionCanvas words={words} t={t} style={style} video={video} />
}
