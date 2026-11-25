"use client"

import { motion, useReducedMotion } from "motion/react"
import { DURATION, EASE } from "@/components/site/motion/tokens"

const WORDS = ["Captions", "people", "actually", "read."]

/** The hero headline: one word per line, each surfacing in turn on load. */
export function HeroTitle({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <h1
      aria-label={WORDS.join(" ")}
      className="font-hero text-[clamp(3.4rem,7.2vw,7rem)] font-extrabold tracking-[-0.035em] leading-[0.92] text-white"
      style={{ fontStretch: "112%", fontVariationSettings: '"wdth" 112' }}
    >
      {WORDS.map((w, i) => {
        const word = w === "actually" ? <span className="text-primary pr-[0.06em] italic">{w}</span> : w
        if (reduce)
          return (
            <span key={w} aria-hidden className="block">
              {word}
            </span>
          )
        return (
          <motion.span
            key={w}
            aria-hidden
            className="block"
            initial={{ opacity: 0, y: "0.28em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: delay + i * 0.09 }}
          >
            {word}
          </motion.span>
        )
      })}
    </h1>
  )
}
