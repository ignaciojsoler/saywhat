"use client"

import { WordsReveal } from "@/components/site/motion/words-reveal"

type Tag = "h1" | "h2" | "h3"

export function RevealHeading({
  text,
  as = "h2",
  className,
}: {
  text: string
  as?: Tag
  className?: string
}) {
  return <WordsReveal text={text} as={as} className={className} />
}
