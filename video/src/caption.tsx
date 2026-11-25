import type { CSSProperties } from "react"
// Reuse the app's real presets so the promo always shows the actual looks.
import { PRESETS, type Preset } from "../../src/lib/captions/presets"
import type { CaptionStyle } from "../../src/lib/captions/types"
import { outlineShadow } from "./ui"

export { PRESETS, type Preset }

const FAMILY: Record<CaptionStyle["font"], { family: string; weight: number }> = {
  montserrat: { family: "Montserrat", weight: 900 },
  bebas: { family: "Bebas Neue", weight: 400 },
  poppins: { family: "Poppins", weight: 800 },
  inter: { family: "Inter", weight: 700 },
}

/**
 * One caption line, mirroring src/components/saywhat/caption-text.tsx.
 * `frameH` = height (px) of the video frame the caption sits in; sizes are % of it.
 */
export function Caption({
  words,
  active,
  style,
  frameH,
  wrapStyle,
}: {
  words: string[]
  active: number
  style: CaptionStyle
  frameH: number
  wrapStyle?: CSSProperties
}) {
  const visible = style.animation === "single" ? (active >= 0 ? [active] : []) : words.map((_, i) => i)
  const f = FAMILY[style.font]
  const css: CSSProperties = {
    fontFamily: f.family,
    fontWeight: f.weight,
    fontSize: (style.size / 100) * frameH,
    lineHeight: 1.2,
    color: style.color,
    textTransform: style.uppercase ? "uppercase" : "none",
    textShadow:
      [...outlineShadow(style.stroke / 100, style.strokeColor), ...(style.shadow ? ["0 0.06em 0.18em rgba(0,0,0,.6)"] : [])].join(", ") ||
      undefined,
    display: "flex",
    justifyContent: "center",
    textAlign: "center",
    ...wrapStyle,
  }
  return (
    <div style={css}>
      <span
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: "0.28em",
          padding: "0 0.35em",
          borderRadius: "0.2em",
          background: style.box ? style.boxColor : undefined,
        }}
      >
        {visible.map((i) => {
          const isActive = i === active
          const hi = (style.animation === "karaoke" || style.animation === "pop") && isActive
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: hi ? style.activeColor : undefined,
                opacity: style.animation === "karaoke" && i > active ? 0.55 : 1,
                transform: style.animation === "pop" && isActive ? "scale(1.1)" : undefined,
                margin: style.animation === "pop" && isActive ? "0 0.06em" : undefined,
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
