"use client"

import { useMemo, type Ref } from "react"
import { CaptionText } from "./caption-text"
import { activeLineAt, activeWordAt, groupWords } from "@/lib/captions/timing"
import { SAMPLE_SRC, SAMPLE_WORDS } from "@/lib/captions/sample-transcript"
import type { CaptionStyle, Word } from "@/lib/captions/types"
import { cn } from "@/lib/utils"

/** Plain black phone: a bezel and a 9:16 screen sized in container units for the captions. */
export function PhoneFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[1.6rem] bg-black p-[3.5%] ring-1 ring-white/10", className)}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.25rem] bg-[#0b0b0a] [container-type:size]">{children}</div>
    </div>
  )
}

/** The demo clip, cropped to fill the frame (the speaker sits slightly right of center). */
export function SampleVideo({ ref, className, preload = "auto", autoPlay = true }: { ref?: Ref<HTMLVideoElement>; className?: string; preload?: "auto" | "metadata" | "none"; autoPlay?: boolean }) {
  return (
    <video
      ref={ref}
      src={SAMPLE_SRC}
      muted
      loop
      playsInline
      autoPlay={autoPlay}
      preload={preload}
      aria-label="Demo clip: a woman talking about botany in a forest"
      className={cn("absolute inset-0 size-full object-cover object-[58%_50%]", className)}
    />
  )
}

/** Caption line for time `t`, positioned like the export (style.position = % from the bottom). */
export function ClipCaption({ t, style, words = SAMPLE_WORDS }: { t: number; style: CaptionStyle; words?: Word[] }) {
  const lines = useMemo(() => groupWords(words, style.wordsPerLine), [words, style.wordsPerLine])
  const k = activeLineAt(words, lines, t)
  if (k < 0) return null
  const [a, b] = lines[k]
  const on = activeWordAt(words, lines[k], t)
  return (
    <div className="pointer-events-none absolute inset-x-[7%]" style={{ bottom: `${style.position}%` }}>
      <CaptionText words={words.slice(a, b).map((w) => w.w)} active={on - a} style={style} />
    </div>
  )
}
