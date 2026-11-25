"use client"

import { useReducedMotion } from "motion/react"
import type { ElementType, ReactNode } from "react"
import { DURATION, EASE, MOTION, RISE, VIEWPORT, type MotionTag } from "./tokens"

/**
 * Fades and lifts its content in once it scrolls into view.
 * `onLoad` plays it on mount instead (above-the-fold content, e.g. the hero).
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
  onLoad = false,
}: {
  children: ReactNode
  delay?: number
  as?: MotionTag
  className?: string
  onLoad?: boolean
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as as ElementType
    return <Static className={className}>{children}</Static>
  }
  const Comp = MOTION[as] as ElementType
  const trigger = onLoad ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT }
  return (
    <Comp className={className} variants={RISE} initial="hidden" {...trigger} transition={{ duration: DURATION.base, ease: EASE, delay }}>
      {children}
    </Comp>
  )
}
