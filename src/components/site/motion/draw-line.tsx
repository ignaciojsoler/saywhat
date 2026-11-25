"use client"

import { motion, useReducedMotion } from "motion/react"
import { DURATION, EASE, VIEWPORT } from "./tokens"

/** A rule that draws itself from the left once it scrolls into view. */
export function DrawLine({ className, delay = 0.15 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className} />
  return (
    <motion.div
      className={className}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.slow, ease: EASE, delay }}
      style={{ transformOrigin: "left" }}
    />
  )
}
