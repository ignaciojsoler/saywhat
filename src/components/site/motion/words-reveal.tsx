"use client"

import { motion, useReducedMotion } from "motion/react"
import { Fragment, useMemo } from "react"
import type { ElementType } from "react"
import { DURATION, EASE, MOTION, VIEWPORT, type MotionTag } from "./tokens"

/**
 * Heading whose words surface one by one, like a caption being spoken (a light blur clears as each
 * word lands). `*word*` renders in italics.
 */
export function WordsReveal({
  text,
  as = "h2",
  className,
  delay = 0,
}: {
  text: string
  as?: MotionTag
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  const words = useMemo(() => text.split(" "), [text])
  const label = text.replaceAll("*", "")
  if (reduce) {
    const Tag = as as ElementType
    return (
      <Tag className={className}>
        {words.map((w, i) => (
          <Fragment key={i}>
            <Word w={w} />
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </Tag>
    )
  }
  const Tag = MOTION[as] as ElementType
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={VIEWPORT} aria-label={label}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <motion.span
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: "0.3em", filter: "blur(4px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: DURATION.base, ease: EASE, delay: delay + i * 0.045 } },
            }}
            aria-hidden
          >
            <Word w={w} />
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  )
}

function Word({ w }: { w: string }) {
  const italic = /^\*.*\*[.,!?]*$/.test(w)
  const clean = w.replaceAll("*", "")
  return italic ? <span className="italic">{clean}</span> : <>{clean}</>
}
