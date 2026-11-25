"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ClipCaption, DEMO_WORDS, SampleVideo } from "@/components/saywhat/sample-clip"
import { prefersReducedMotion } from "@/components/saywhat/use-video-time"
import { PRESETS } from "@/lib/captions/presets"
import { PROMO_DURATION } from "@/lib/captions/promo-transcript"
import { timecode } from "@/lib/captions/sample-transcript"
import { groupWords } from "@/lib/captions/timing"
import { cn } from "@/lib/utils"

const STYLE = PRESETS[0].style
/** The word speech-to-text "misheard", and the fix typed over it. */
const TYPO = "MP3"
const FIX = "MP4"
const TARGET = Math.max(0, DEMO_WORDS.findIndex((w) => w.w === FIX)) // "…export an MP4…"
const LINES = groupWords(DEMO_WORDS, STYLE.wordsPerLine)
const TARGET_LINE = LINES.findIndex(([a, b]) => TARGET >= a && TARGET < b)
/** transcript rows shown: a window of lines around the edited one */
const SHOWN = LINES.slice(Math.max(0, TARGET_LINE - 4), TARGET_LINE + 4)
/** Freeze-frame time for the preview: the corrected word is on screen. */
const FRAME = DEMO_WORDS[TARGET].s + 0.3

type Phase = { text: string; state: "typo" | "select" | "typing" | "fixed" }

/** Looping script: show the typo, select it, delete, type the fix, hold, start over. */
function buildScript(): { phase: Phase; ms: number }[] {
  const steps: { phase: Phase; ms: number }[] = [
    { phase: { text: TYPO, state: "typo" }, ms: 1600 },
    { phase: { text: TYPO, state: "select" }, ms: 700 },
  ]
  for (let i = 1; i <= FIX.length; i++) steps.push({ phase: { text: FIX.slice(0, i), state: "typing" }, ms: 90 + (i % 3) * 30 })
  steps.push({ phase: { text: FIX, state: "fixed" }, ms: 3200 })
  return steps
}

const SCRIPT = buildScript()

export function EditorDemo() {
  const script = SCRIPT
  const [step, setStep] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const phase = script[step].phase

  // freeze the preview on the edited line
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const seek = () => {
      v.pause()
      v.currentTime = FRAME
    }
    if (v.readyState >= 1) seek()
    else v.addEventListener("loadedmetadata", seek, { once: true })
  }, [])

  // run the typing loop only while the section is on screen
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setStep(script.length - 1))
      return () => cancelAnimationFrame(id)
    }
    let timer = 0
    let visible = false
    let i = 0
    const next = () => {
      if (!visible) return
      i = (i + 1) % script.length
      setStep(i)
      timer = window.setTimeout(next, script[i].ms)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      clearTimeout(timer)
      if (visible) timer = window.setTimeout(next, script[i].ms)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [script])

  const words = useMemo(() => {
    const w = DEMO_WORDS.slice()
    w[TARGET] = { ...w[TARGET], w: phase.state === "typo" || phase.state === "select" ? TYPO : phase.text || " " }
    return w
  }, [phase])

  return (
    <div ref={rootRef} className="overflow-hidden rounded-lg border border-white/10 bg-[#141414] text-[#fafafa]">
      {/* title bar */}
      <div className="flex h-10 items-center gap-3 border-b border-white/10 px-3">
        <span className="wordmark text-[15px] leading-none">Saywhat</span>
        <span className="h-4 w-px bg-white/15" />
        <span className="min-w-0 truncate font-mono text-xs text-white/75">saywhat-promo.mp4</span>
        <span className="ml-auto rounded-[5px] bg-[var(--caption)] px-2.5 py-1 text-xs font-semibold text-[#0a0a0a]">Export</span>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,1fr)_200px]">
        {/* transcript */}
        <div className="order-2 border-t border-white/10 sm:order-1 sm:border-t-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs">
            <span className="font-medium">Transcript</span>
            <span className="font-mono text-white/75">{DEMO_WORDS.length} words</span>
          </div>
          <ol className="flex flex-col gap-px p-1.5 text-[13px]">
            {SHOWN.map(([a, b]) => {
              const k = LINES.findIndex((l) => l[0] === a)
              const editing = k === TARGET_LINE
              return (
                <li
                  key={a}
                  className={cn(
                    "flex items-baseline gap-2.5 rounded-[5px] border-l-2 border-transparent px-2 py-1.5",
                    editing && "border-[var(--caption)] bg-white/[0.06]",
                  )}
                >
                  <span className={cn("w-14 shrink-0 font-mono text-xs tabular-nums", editing ? "text-[#ffb3a3]" : "text-white/75")}>
                    {timecode(DEMO_WORDS[a].s)}
                  </span>
                  <span className="min-w-0">
                    {DEMO_WORDS.slice(a, b).map((w, j) => {
                      const idx = a + j
                      if (idx !== TARGET) return <span key={idx}>{w.w} </span>
                      return <EditedWord key={idx} phase={phase} />
                    })}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* preview */}
        <div className="order-1 flex flex-col items-center gap-2 p-3 sm:order-2">
          <div className="relative aspect-[9/16] w-[46%] overflow-hidden rounded-md bg-black [container-type:size] sm:w-full">
            <SampleVideo ref={videoRef} autoPlay={false} preload="metadata" />
            <ClipCaption t={FRAME} style={STYLE} words={words} />
          </div>
          <span className="font-mono text-xs text-white/75 tabular-nums">{timecode(FRAME)} / {timecode(PROMO_DURATION)}</span>
        </div>
      </div>
    </div>
  )
}

function EditedWord({ phase }: { phase: Phase }) {
  if (phase.state === "typo")
    return <span className="underline decoration-[var(--signal)] decoration-wavy decoration-from-font underline-offset-4">{TYPO}</span>
  if (phase.state === "select") return <span className="rounded-[3px] bg-[var(--caption)] px-0.5 text-[#0a0a0a]">{TYPO}</span>
  return (
    <span className={cn(phase.state === "fixed" && "text-[var(--caption)]")}>
      {phase.text}
      {phase.state === "typing" && <span aria-hidden className="caret ml-px inline-block h-[1.05em] w-px translate-y-[0.15em] bg-[var(--caption)]" />}
    </span>
  )
}
