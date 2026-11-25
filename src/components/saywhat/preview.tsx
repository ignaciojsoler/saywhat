"use client"

import { useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CaptionText } from "./caption-text"
import { Timeline } from "./timeline"
import { activeLineAt, activeWordAt } from "@/lib/captions/timing"
import { clock } from "@/lib/captions/formats"
import { aspectRatio } from "@/lib/export-video"
import type { Aspect } from "@/lib/captions/types"
import { useEditor } from "@/store/editor"
import { usePlayer } from "@/store/player"

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
]

function LiveCaptions() {
  const words = useEditor((s) => s.words)
  const lines = useEditor((s) => s.lines)
  const style = useEditor((s) => s.style)
  // select only the active line/word: re-render when they change, not every frame
  const k = usePlayer((s) => activeLineAt(words, lines, s.time))
  const on = usePlayer((s) => (k >= 0 ? activeWordAt(words, lines[k], s.time) : -1))
  if (k < 0) return null
  const [a, b] = lines[k]
  return (
    <div className="pointer-events-none absolute inset-x-[6%]" style={{ bottom: `${style.position}%` }}>
      <CaptionText words={words.slice(a, b).map((w) => w.w)} active={on - a} style={style} />
    </div>
  )
}

export function Preview() {
  const videoUrl = useEditor((s) => s.videoUrl)
  const aspect = useEditor((s) => s.aspect)
  const setAspect = useEditor((s) => s.setAspect)
  const duration = useEditor((s) => s.duration)
  const setDuration = useEditor((s) => s.setDuration)
  const { playing, time, ratio, setVideo, setTime, setPlaying, setRatio, toggle } = usePlayer()
  const ref = useRef<HTMLVideoElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ w: 0, h: 0 })

  // largest frame with the chosen aspect that fits the available space
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setVideo(ref.current)
    return () => setVideo(null)
  }, [setVideo])

  // while playing, publish the current time every frame
  useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      if (ref.current) setTime(ref.current.currentTime)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, setTime])

  if (!videoUrl) return null
  const frameRatio = aspectRatio(aspect, ratio)
  const frameW = Math.min(area.w, area.h * frameRatio)
  const frameH = frameW / frameRatio

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">Preview</span>
        <ToggleGroup type="single" size="sm" variant="outline" value={aspect} onValueChange={(v) => v && setAspect(v as Aspect)}>
          {ASPECTS.map((a) => (
            <ToggleGroupItem key={a.value} value={a.value} className="px-2 text-xs">
              {a.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div ref={areaRef} className="grid min-h-0 flex-1 place-items-center">
        <div
          className="relative overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/10 [container-type:size]"
          style={{ width: frameW || undefined, height: frameH || undefined }}
        >
          <video
            ref={ref}
            src={videoUrl}
            className="absolute inset-0 size-full cursor-pointer object-cover"
            playsInline
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onSeeked={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight || 16 / 9)
              setDuration(e.currentTarget.duration)
            }}
          />
          <LiveCaptions />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="icon-sm" variant="secondary" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {clock(time)} / {clock(duration || 0)}
        </span>
      </div>
      <Timeline />
    </div>
  )
}
