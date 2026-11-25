import type { CSSProperties, ReactNode } from "react"
import { Easing, interpolate, spring } from "remotion"
import { FPS } from "./timing"

export const C = {
  bg: "#0A0A0A",
  surface: "#141414",
  surface2: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FAFAFA",
  muted: "#8F8F8F",
  yellow: "#FFE14D",
}

export const FONT = {
  sans: "Inter, sans-serif",
  brand: "Montserrat, sans-serif",
}

const easeOut = Easing.bezier(0.22, 1, 0.36, 1)
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)

/** 0 → 1 between `start` and `start + dur` frames, eased. */
export function prog(f: number, start: number, dur = 12, ease: "out" | "inOut" = "out") {
  return interpolate(f, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease === "out" ? easeOut : easeInOut,
  })
}

/** Springy 0 → 1 (with a little overshoot) starting at `start`. */
export function pop(f: number, start: number, damping = 12) {
  return spring({ frame: f - start, fps: FPS, config: { damping, stiffness: 180, mass: 0.6 } })
}

/** Fade + rise in. */
export function rise(f: number, start: number, dy = 40, dur = 14): CSSProperties {
  const p = prog(f, start, dur)
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` }
}

/** Scene envelope: fades/scales in at `a`, out at `b`. Returns null when not visible. */
export function envelope(f: number, a: number, b: number, inDur = 10, outDur = 8): CSSProperties | null {
  if (f < a - 1 || f > b + outDur) return null
  const i = inDur > 0 ? prog(f, a, inDur) : 1
  const o = 1 - prog(f, b, outDur, "inOut")
  return {
    opacity: Math.min(i, o),
    transform: `translateY(${(1 - i) * 30 - (1 - o) * 30}px) scale(${0.98 + 0.02 * Math.min(i, o)})`,
  }
}

/** Text outline from 16 shadows, same technique as the app's CaptionText. */
export function outlineShadow(widthEm: number, color: string) {
  if (widthEm <= 0) return []
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return `${(Math.cos(a) * widthEm).toFixed(3)}em ${(Math.sin(a) * widthEm).toFixed(3)}em 0 ${color}`
  })
}

/** The brand wordmark: Montserrat 900, yellow, thick black outline. */
export function Wordmark({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: FONT.brand,
        fontWeight: 900,
        fontSize: size,
        color: C.yellow,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        textShadow: [...outlineShadow(0.09, "#000"), "0 0.06em 0.2em rgba(0,0,0,.6)"].join(", "),
        ...style,
      }}
    >
      Saywhat
    </div>
  )
}

export function Abs({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>
}

/** Thin stroke icons (24px grid). */
export function Icon({ d, size = 32, color = C.text, stroke = 2 }: { d: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export const ICON = {
  upload: "M12 16V4m0 0-5 5m5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  download: "M12 4v12m0 0-5-5m5 5 5-5M4 18v0a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2",
  check: "M5 12.5 10 17 19 7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  film: "M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4",
  wave: "M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0",
  shield: "M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3zM9 12l2 2 4-4",
}
