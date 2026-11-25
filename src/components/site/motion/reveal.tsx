"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"
import type { ElementType, ReactNode } from "react"

const EASE = [0.16, 1, 0.3, 1] as const

const MOTION = {
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

export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode
  delay?: number
  as?: keyof typeof MOTION
  className?: string
}) {
  const reduce = useReducedMotion()
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setFallback(true), 1500)
    return () => clearTimeout(t)
  }, [])
  if (reduce) {
    const Static = (as ?? "div") as ElementType
    return <Static className={className}>{children}</Static>
  }
  const Comp = MOTION[as] as ElementType
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      animate={fallback ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Comp>
  )
}