"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ClipCaption, PhoneFrame, SampleVideo } from "./sample-clip"
import { playMuted, prefersReducedMotion, useVideoTime } from "./use-video-time"
import { PRESETS } from "@/lib/captions/presets"
import { timecode } from "@/lib/captions/sample-transcript"
import { cn } from "@/lib/utils"

/**
 * Live preview of the product's output: real footage with captions synced to the video, in any preset.
 * `frame` wraps only the phone (e.g. a 3D tilt) so the preset switcher below stays flat.
 */
export function CaptionDemo({
  className,
  phoneClassName,
  chrome = false,
  frame = (phone) => phone,
}: {
  className?: string
  phoneClassName?: string
  chrome?: boolean
  frame?: (phone: ReactNode) => ReactNode
}) {
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const ref = useRef<HTMLVideoElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const { t, playing } = useVideoTime(ref)
  const preset = PRESETS.find((p) => p.id === presetId)!

  useEffect(() => {
    const v = ref.current
    if (!v) return
    setVideo(v)
    if (prefersReducedMotion()) {
      // a still frame with a caption on screen; the viewer can press play
      v.pause()
      v.currentTime = 1.6
    } else playMuted(v)
  }, [])

  const togglePlay = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {frame(
      <PhoneFrame chrome={chrome} className={cn("w-[min(290px,72vw)]", phoneClassName)}>
        <SampleVideo ref={ref} autoPlay={false} />
        <button type="button" onClick={togglePlay} aria-label={playing ? "Pause demo" : "Play demo"} className="absolute inset-0 cursor-pointer" />
        <ClipCaption t={t} style={preset.style} video={video} />

        {/* running timecode, like a camera's REC overlay */}
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-xs text-white/90 tabular-nums">
          <span className={cn("size-1.5 rounded-full", playing ? "bg-signal" : "bg-white/40")} />
          {timecode(t)}
        </div>
      </PhoneFrame>,
      )}

      {/* preset switcher: one quiet row; scrolls sideways (with faded edges) when it doesn't fit */}
      <div
        role="radiogroup"
        aria-label="Caption style"
        className="w-full max-w-[520px] overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max gap-2 px-6">
        {PRESETS.map((p) => {
          const active = p.id === presetId
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPresetId(p.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-white/30 bg-white/10 text-white" : "border-white/12 text-white/70 hover:border-white/25",
              )}
              title={p.tagline}
            >
              {p.name}
            </button>
          )
        })}
        </div>
      </div>
    </div>
  )
}

