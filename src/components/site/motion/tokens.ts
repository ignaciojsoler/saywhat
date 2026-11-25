import { motion } from "motion/react"

/**
 * One motion language for the marketing site: a long, soft ease-out (fast start, quiet landing),
 * short travel, and reveals that fire once as content actually enters the viewport.
 */
export const EASE = [0.22, 1, 0.36, 1] as const

export const DURATION = { fast: 0.5, base: 0.85, slow: 1.1 } as const

/** Fire when the element is ~12% into the viewport, not the moment its first pixel shows. */
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const

/** Blocks rise a little and fade in; no blur on large surfaces (muddy and expensive). */
export const RISE = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
} as const

export const STAGGER = 0.07

export const MOTION = {
  div: motion.div,
  section: motion.section,
  ul: motion.ul,
  li: motion.li,
  p: motion.p,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  article: motion.article,
} as const

export type MotionTag = keyof typeof MOTION
