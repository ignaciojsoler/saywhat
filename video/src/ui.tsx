import type { CSSProperties, ReactNode } from "react"
import { Easing, interpolate, spring } from "remotion"
import { FPS } from "./timing"

export const C = {
  bg: "#0A0A0A",
  text: "#FAFAFA",
  dim: "#6E6E6E",
  line: "rgba(255,255,255,0.10)",
  yellow: "#FFE14D",
}

export const FONT = {
  display: "'Inter Tight Variable', 'Inter Tight', sans-serif",
  serif: "'Instrument Serif', serif",
  caption: "Montserrat, sans-serif",
}

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-like out
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  soft: Easing.bezier(0.45, 0, 0.2, 1),
}

/** 0 → 1 between `start` and `start + dur` frames, eased. */
export function prog(f: number, start: number, dur = 14, ease: (t: number) => number = EASE.out) {
  return interpolate(f, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Critically-damped-ish spring 0 → 1 starting at `start`. */
export function spr(f: number, start: number, damping = 18, stiffness = 140) {
  return spring({ frame: f - start, fps: FPS, config: { damping, stiffness, mass: 0.8 } })
}

/** Blur-in + rise used for every text reveal. */
export function reveal(f: number, start: number, dur = 12, dy = 36): CSSProperties {
  const p = prog(f, start, dur)
  return {
    opacity: p,
    filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined,
    transform: `translateY(${(1 - p) * dy}px)`,
  }
}

/**
 * Scene envelope: blur/scale in at `a`, blur/scale out at `b`. Returns null when off.
 * Pass inDur = 0 for a scene that must be fully visible on its first frame.
 */
export function scene(f: number, a: number, b: number, inDur = 14, outDur = 12): CSSProperties | null {
  if (f < a - 1 || f > b + outDur) return null
  const i = inDur > 0 ? prog(f, a, inDur) : 1
  const o = prog(f, b, outDur, EASE.inOut)
  const v = Math.min(i, 1 - o)
  const blur = (1 - i) * 18 + o * 22
  return {
    position: "absolute",
    inset: 0,
    opacity: v,
    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
    transform: `scale(${lerp(0.96, 1, i) + o * 0.06})`,
  }
}

/** Text outline from 16 shadows (same technique the app uses for captions). */
export function outline(widthEm: number, color = "#000") {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return `${(Math.cos(a) * widthEm).toFixed(3)}em ${(Math.sin(a) * widthEm).toFixed(3)}em 0 ${color}`
  })
}

export function Abs({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>
}

/** Big display headline. `parts` alternates plain / serif-italic segments: ["One ", "second."] */
export function Headline({
  f,
  at,
  parts,
  size = 128,
  stagger = 4,
  dur = 12,
  style,
}: {
  f: number
  at: number | number[]
  parts: { t: string; serif?: boolean; color?: string }[]
  size?: number
  stagger?: number
  dur?: number
  style?: CSSProperties
}) {
  const words = parts.flatMap((p) => p.t.split(/(?<=\s)/).map((w) => ({ ...p, t: w })))
  return (
    <div
      style={{
        fontFamily: FONT.display,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.045em",
        lineHeight: 0.98,
        color: C.text,
        textAlign: "center",
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            fontFamily: w.serif ? FONT.serif : undefined,
            fontStyle: w.serif ? "italic" : undefined,
            fontWeight: w.serif ? 400 : undefined,
            letterSpacing: w.serif ? "-0.02em" : undefined,
            fontSize: w.serif ? "1.08em" : undefined,
            color: w.color,
            ...reveal(f, Array.isArray(at) ? (at[i] ?? at[at.length - 1]) : at + i * stagger, dur),
          }}
        >
          {w.t}
        </span>
      ))}
    </div>
  )
}
