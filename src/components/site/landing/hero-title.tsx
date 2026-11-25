"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const WORDS = ["Captions", "people", "actually", "read."]
/** Index of the word set as a live caption. */
const CAPTION = 2
const STEP = 260

/**
 * H1 read out word by word on load, karaoke style. The key word is set as an actual
 * caption (Montserrat 900, outline) that pops yellow when it's "spoken".
 */
export function HeroTitle() {
  // -1 = not started; server HTML renders everything inked so there's no flash without JS
  const [on, setOn] = useState(WORDS.length)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let i = -1
    let timer = 0
    const run = () => {
      setOn(i)
      i++
      // play once, then let the caption word "say" itself again every few seconds
      if (i <= WORDS.length) timer = window.setTimeout(run, i === 0 ? 200 : STEP)
      else
        timer = window.setTimeout(() => {
          i = CAPTION - 1
          run()
        }, 4200)
    }
    timer = window.setTimeout(run, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <h1 aria-label={WORDS.join(" ")} className="font-display text-[3.2rem] font-semibold leading-[1] tracking-[-0.045em] text-balance sm:text-7xl lg:text-[5.75rem]">
      {WORDS.map((w, i) => {
        if (i === CAPTION) {
          const active = i === on
          return (
            <span key={w} aria-hidden>
              <span
                className={cn(
                  "font-caption mx-[0.04em] inline-block align-[0.06em] text-[0.62em] tracking-normal uppercase transition-[transform,color,opacity] duration-100",
                )}
                style={{
                  fontWeight: 900,
                  color: active ? "var(--caption)" : "#fff",
                  transform: active ? "scale(1.1) rotate(-1.5deg)" : "rotate(-1.5deg)",
                  WebkitTextStroke: "0.16em #000",
                  paintOrder: "stroke fill",
                }}
              >
                {w}
              </span>{" "}
            </span>
          )
        }
        return (
          <span key={w} aria-hidden>
            <span className={"inline-block"}>{w}</span>
            {i < WORDS.length - 1 && " "}
          </span>
        )
      })}
    </h1>
  )
}
