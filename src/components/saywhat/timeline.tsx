"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { activeLineAt } from "@/lib/captions/timing"
import { cn } from "@/lib/utils"
import { useEditor } from "@/store/editor"
import { usePlayer } from "@/store/player"

const MIN_PPS = 160 // px per second: enough room to read short words

/**
 * Word timeline: every word as a block at its real time. Click to seek; the playhead follows playback.
 * Doubles as the scrubber.
 */
export function Timeline() {
  const words = useEditor((s) => s.words)
  const lines = useEditor((s) => s.lines)
  const duration = useEditor((s) => s.duration)
  const time = usePlayer((s) => s.time)
  const seek = usePlayer((s) => s.seek)
  const scroller = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const total = Math.max(duration, words.at(-1)?.e ?? 0, 1)
  const pps = Math.max(MIN_PPS, width / total)
  const k = activeLineAt(words, lines, time)
  const lineOf = useMemo(() => {
    const m = new Int32Array(words.length)
    lines.forEach(([a, b], i) => m.fill(i, a, b))
    return m
  }, [words.length, lines])

  // keep the playhead in view whenever time moves (playback, keyboard seeks, transcript jumps).
  // Runs only on time changes, so scrolling around manually while paused isn't overridden.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const x = time * pps
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 80) el.scrollLeft = x - el.clientWidth * 0.25
  }, [time, pps])

  const seconds = Array.from({ length: Math.floor(total) + 1 }, (_, i) => i)

  return (
    <div
      ref={scroller}
      className="relative overflow-x-auto overflow-y-hidden rounded-lg bg-black/20 ring-1 ring-white/5 [scrollbar-color:rgb(243_240_255/0.18)_transparent] [scrollbar-width:thin]"
    >
      <div
        className="relative h-[72px] cursor-pointer select-none"
        style={{ width: total * pps }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - r.left) / pps)
        }}
      >
        {/* ruler */}
        {seconds.map((s) => (
          <div key={s} className="absolute top-0 h-full border-l border-white/5" style={{ left: s * pps }}>
            {s % 5 === 0 && <span className="text-muted-foreground absolute top-1 left-1 text-[10px] tabular-nums">{s}s</span>}
          </div>
        ))}

        {/* words */}
        {words.map((w, i) => {
          const inLine = lineOf[i] === k
          const spoken = w.s <= time && time < w.e + 0.05
          const width = Math.max(4, (w.e - w.s) * pps - 2)
          return (
            <div
              key={i}
              title={w.w}
              className={cn(
                "absolute top-6 flex h-9 items-center overflow-hidden rounded-[5px] px-1.5 text-[11px] leading-none whitespace-nowrap transition-colors",
                spoken
                  ? "bg-primary text-primary-foreground font-semibold"
                  : inLine
                    ? "bg-white/15 text-foreground"
                    : "text-muted-foreground bg-white/[0.06]",
              )}
              style={{ left: w.s * pps, width }}
            >
              {width >= 22 && w.w}
            </div>
          )
        })}

        {/* playhead */}
        <div className="bg-primary pointer-events-none absolute top-0 bottom-0 w-px" style={{ left: time * pps }}>
          <div className="bg-primary absolute -top-px -left-[5px] size-[11px] rotate-45 rounded-[2px]" />
        </div>
      </div>
    </div>
  )
}
