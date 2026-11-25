"use client"

// caption typefaces not loaded by the root layout (which ships Montserrat 900, Bebas, Poppins, Inter)
import "@fontsource-variable/inter-tight/index.css"
import "@fontsource-variable/bricolage-grotesque/index.css"
import "@fontsource/instrument-serif/400.css"
import "@fontsource/instrument-serif/400-italic.css"
import "@fontsource/montserrat/800.css"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { coverRect, drawCaptions, fontsFor, type DrawOptions } from "@/lib/captions/canvas"
import { groupWords } from "@/lib/captions/timing"
import type { CaptionStyle, Line, Word } from "@/lib/captions/types"
import { cn } from "@/lib/utils"

/** Device pixel ratio, capped: beyond 2x the text is no sharper but costs 2x more to paint. */
const dpr = () => (typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1))

/** Bumps when the style's fonts finish loading, so the canvas redraws with the real face. */
function useFontsReady(style: CaptionStyle) {
  const [version, setVersion] = useState(0)
  const key = fontsFor(style).join("|")
  useEffect(() => {
    const fonts = key.split("|")
    if (fonts.every((f) => document.fonts.check(f))) return
    let alive = true
    Promise.all(fonts.map((f) => document.fonts.load(f)))
      .catch(() => {})
      .then(() => alive && setVersion((v) => v + 1))
    return () => {
      alive = false
    }
  }, [key])
  return version
}

/** Draw a video "object-fit: cover" into w×h. */
function paintCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, w: number, h: number, pos: [number, number]) {
  if (v.readyState < 2 || !v.videoWidth) return false
  const r = coverRect(v.videoWidth, v.videoHeight, w, h, pos[0], pos[1])
  ctx.drawImage(v, r.dx, r.dy, r.dw, r.dh)
  return true
}

/**
 * Captions for time `t`, drawn on a canvas that covers its (positioned) parent, which plays
 * the role of the video frame. It uses the exact renderer of the MP4 export, so the preview
 * is what gets burned in. Animation is a pure function of `t` (video time).
 */
export function CaptionCanvas({
  words,
  lines,
  t,
  style,
  video,
  paintVideo = false,
  objectPosition = [0.5, 0.5],
  className,
  label,
}: {
  words: Word[]
  /** precomputed lines; grouped from `style.wordsPerLine` when omitted */
  lines?: Line[]
  t: number
  style: CaptionStyle
  /** the video under the captions: frosted by glass panels, and painted as background with `paintVideo` */
  video?: HTMLVideoElement | null
  paintVideo?: boolean
  /** focus of the cover crop, like CSS object-position (0–1) */
  objectPosition?: [number, number]
  className?: string
  /** accessible text; the canvas is decorative without it */
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const fontsVersion = useFontsReady(style)
  const grouped = useMemo(() => lines ?? groupWords(words, style.wordsPerLine), [lines, words, style.wordsPerLine])
  const [px, py] = objectPosition

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const k = dpr()
      setSize({ w: Math.round(e.contentRect.width * k), h: Math.round(e.contentRect.height * k) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // when painting the video while paused (seek, first load), redraw once the new frame is actually presented
  const [frameTick, setFrameTick] = useState(0)
  const usesFrame = !!video && (paintVideo || style.background === "glass")
  useEffect(() => {
    if (!video || !usesFrame) return
    const bump = () => setFrameTick((n) => n + 1)
    const onFrame = () => {
      if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(bump)
      else requestAnimationFrame(bump)
    }
    video.addEventListener("seeked", onFrame)
    video.addEventListener("loadeddata", onFrame)
    return () => {
      video.removeEventListener("seeked", onFrame)
      video.removeEventListener("loadeddata", onFrame)
    }
  }, [video, usesFrame])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !size.w || !size.h) return
    if (el.width !== size.w) el.width = size.w
    if (el.height !== size.h) el.height = size.h
    const ctx = el.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, size.w, size.h)
    const pos: [number, number] = [px, py]
    if (video && paintVideo) paintCover(ctx, video, size.w, size.h, pos)
    const opts: DrawOptions = {}
    if (video && style.background === "glass")
      opts.backdrop = (c, w, h) => {
        if (!paintCover(c, video, w, h, pos)) c.clearRect(0, 0, w, h)
      }
    drawCaptions(ctx, size.w, size.h, words, grouped, t, style, opts)
  }, [t, style, words, grouped, size, fontsVersion, video, paintVideo, px, py, frameTick])

  return (
    <canvas
      ref={ref}
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  )
}
