"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useState } from "react"
import type { ElementType } from "react"
import { Fragment } from "react"

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

export function WordsReveal({
  text,
  as = "h2",
  className,
  delay = 0,
}: {
  text: string
  as?: keyof typeof MOTION
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setFallback(true), 1500)
    return () => clearTimeout(t)
  }, [])
  const words = useMemo(() => text.split(" "), [text])
  const Tag = (as ?? "h2") as ElementType
  if (reduce) {
    return <Tag className={className}>{text}</Tag>
  }
  const MotionTag = MOTION[as ?? "h2"] as ElementType
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      animate={fallback ? "show" : undefined}
      viewport={{ once: true, amount: 0.15 }}
      aria-label={text}
    >
      {words.map((w, i) => {
        const italic = /^\*.*\*[.,!?]*$/.test(w)
        const clean = w.replaceAll("*", "")
        return (
          <Fragment key={i}>
            <motion.span
              key={"w" + i}
              className={"inline-block" + (italic ? " italic" : "")}
              variants={{
                hidden: { opacity: 0, y: "0.4em", filter: "blur(6px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE, delay: delay + i * 0.05 } },
              }}
              aria-hidden
            >
              {clean}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        )
      })}
    </MotionTag>
  )
}