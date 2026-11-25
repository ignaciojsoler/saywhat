"use client"

import type { CSSProperties } from "react"
import { FONTS, type CaptionStyle } from "@/lib/captions/types"
import { cn } from "@/lib/utils"

/**
 * Render one caption line in the given style. Mirrors the export canvas:
 * sizes are relative to the container height (cqh units).
 * `active` = index of the word being spoken (-1 if none).
 */
/**
 * Outline built from text-shadows in 16 directions. -webkit-text-stroke paints over the fill
 * in browsers without paint-order support on HTML text, which makes letters look hollow.
 */
function outlineShadow(widthEm: number, color: string) {
  if (widthEm <= 0) return []
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return `${(Math.cos(a) * widthEm).toFixed(3)}em ${(Math.sin(a) * widthEm).toFixed(3)}em 0 ${color}`
  })
}

export function CaptionText({
  words,
  active,
  style,
  className,
}: {
  words: string[]
  active: number
  style: CaptionStyle
  className?: string
}) {
  const visible = style.animation === "single" ? (active >= 0 ? [active] : []) : words.map((_, i) => i)
  if (!visible.length) return null

  const css = {
    "--fs": `${style.size}cqh`,
    fontFamily: FONTS[style.font].css,
    fontWeight: FONTS[style.font].weight,
    fontSize: "var(--fs)",
    lineHeight: 1.2,
    color: style.color,
    textTransform: style.uppercase ? "uppercase" : "none",
    textShadow:
      [...outlineShadow(style.stroke / 100, style.strokeColor), ...(style.shadow ? ["0 0.06em 0.18em rgba(0,0,0,.6)"] : [])].join(
        ", ",
      ) || undefined,
  } as CSSProperties

  return (
    <div className={cn("flex flex-wrap justify-center gap-x-[0.28em] text-center", className)} style={css}>
      <span
        className="inline-flex flex-wrap justify-center gap-x-[0.28em] rounded-[0.2em] px-[0.35em] [box-decoration-break:clone]"
        style={style.box ? { background: style.boxColor } : undefined}
      >
        {visible.map((i) => {
          const isActive = i === active
          let color: string | undefined
          let opacity = 1
          if ((style.animation === "karaoke" || style.animation === "pop") && isActive) color = style.activeColor
          if (style.animation === "karaoke" && i > active) opacity = 0.55
          return (
            <span
              key={i}
              className="inline-block transition-[transform,margin] duration-75"
              style={{
                color,
                opacity,
                transform: style.animation === "pop" && isActive ? "scale(1.1)" : undefined,
                marginInline: style.animation === "pop" && isActive ? "0.06em" : undefined,
              }}
            >
              {words[i]}
            </span>
          )
        })}
      </span>
    </div>
  )
}
