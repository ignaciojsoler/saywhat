"use client"

import { useReducedMotion } from "motion/react"
import type { ElementType, ReactNode } from "react"
import { DURATION, EASE, MOTION, RISE, STAGGER, VIEWPORT, type MotionTag } from "./tokens"

const container = { hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.05 } } }
const item = { hidden: RISE.hidden, show: { ...RISE.show, transition: { duration: DURATION.base, ease: EASE } } }

/** Reveals its StaggerItem children one after another once the group scrolls into view. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: MotionTag }) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as as ElementType
    return <Static className={className}>{children}</Static>
  }
  const Comp = MOTION[as] as ElementType
  return (
    <Comp className={className} variants={container} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </Comp>
  )
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: MotionTag }) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as as ElementType
    return <Static className={className}>{children}</Static>
  }
  const Comp = MOTION[as] as ElementType
  return (
    <Comp className={className} variants={item}>
      {children}
    </Comp>
  )
}
