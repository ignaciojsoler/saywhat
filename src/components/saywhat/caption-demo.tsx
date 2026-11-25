"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2Icon, VolumeXIcon } from "lucide-react"
import { ClipCaption, PhoneFrame, SampleVideo } from "./sample-clip"
import { playMuted, prefersReducedMotion, useVideoTime } from "./use-video-time"
import { PRESETS } from "@/lib/captions/presets"
import { timecode } from "@/lib/captions/sample-transcript"
import type { Preset } from "@/lib/captions/presets"
import { cn } from "@/lib/utils"

/** Live preview of the product's output: real footage with captions synced to the video, in any preset. */
export function CaptionDemo({ className }: { className?: string }) {
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [muted, setMuted] = useState(true)
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
      v.currentTime = 7.5
    } else playMuted(v)
  }, [])

  const toggleSound = () => {
    const v = ref.current
    if (!v) return
    v.muted = !muted
    if (v.paused) v.play().catch(() => {})
    setMuted(!muted)
  }

  const togglePlay = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <PhoneFrame className="w-[min(290px,72vw)]">
        <SampleVideo ref={ref} autoPlay={false} />
        <button type="button" onClick={togglePlay} aria-label={playing ? "Pause demo" : "Play demo"} className="absolute inset-0 cursor-pointer" />
        <ClipCaption t={t} style={preset.style} video={video} />

        {/* running timecode, like a camera's REC overlay */}
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-xs text-white/90 tabular-nums">
          <span className={cn("size-1.5 rounded-full", playing ? "bg-signal" : "bg-white/40")} />
          {timecode(t)}
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Turn sound on" : "Mute"}
          aria-pressed={!muted}
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-md bg-black/55 text-white/90 transition-colors outline-none hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
        </button>
      </PhoneFrame>

      {/* preset switcher */}
      <div role="radiogroup" aria-label="Caption style" className="flex flex-wrap justify-center gap-1">
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
                "focus-visible:ring-ring rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2",
                active ? "border-transparent text-[#0a0a0a]" : "text-muted-foreground hover:text-foreground border-white/10 hover:border-white/25",
              )}
              style={active ? { background: chipColor(p) } : undefined}
              title={p.tagline}
            >
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Chip color for the active preset: its accent, or off-white when the accent is white. */
const chipColor = (p: Preset) => (/^#f{3,8}$/i.test(p.style.activeColor) || p.style.highlight === "none" ? "#fafafa" : p.style.activeColor)
