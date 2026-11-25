"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Tag = "h1" | "h2" | "h3"

/**
 * Heading whose words get "inked in" one by one (~60 ms apart) the first time it enters the
 * viewport. Wrap a word in *asterisks* to set it in italics. Server HTML renders fully inked,
 * so nothing is hidden without JS; prefers-reduced-motion skips the effect (see globals.css).
 */
export function RevealHeading({ text, as: As = "h2", className }: { text: string; as?: Tag; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [state, setState] = useState<"idle" | "armed" | "in">("idle")

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("in")
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    )
    // ghost the words first, then start observing on the next frame so the transition runs
    const id = requestAnimationFrame(() => {
      setState("armed")
      requestAnimationFrame(() => io.observe(el))
    })
    return () => {
      cancelAnimationFrame(id)
      io.disconnect()
    }
  }, [])

  const words = text.split(" ")
  return (
    <As
      ref={ref}
      aria-label={text.replaceAll("*", "")}
      data-armed={state !== "idle" ? "" : undefined}
      data-in={state === "in" ? "" : undefined}
      className={cn("reveal", className)}
    >
      {words.map((w, i) => {
        const italic = /^\*.*\*[.,!?]*$/.test(w)
        const clean = w.replaceAll("*", "")
        return (
          <span key={i} aria-hidden>
            <span className={cn("reveal-word inline-block", italic && "italic")} style={{ "--i": i } as React.CSSProperties}>
              {clean}
            </span>
            {i < words.length - 1 && " "}
          </span>
        )
      })}
    </As>
  )
}
